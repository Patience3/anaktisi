"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import { CreatePatientSchema } from "@/lib/validations";

// Patient type definition
export interface Patient {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    created_at: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    role: string;
    category?: {
        id: string;
        name: string;
    } | null;
}

// Status update validation schema
const UpdatePatientStatusSchema = z.object({
    patientId: z.string().uuid("Invalid patient ID"),
    isActive: z.boolean()
});

// Edit patient form validation schema
const EditPatientSchema = z.object({
    patientId: z.string().uuid("Invalid patient ID"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Valid email is required"),
    isActive: z.boolean().default(true),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    phone: z.string().optional(),
});

// Category assignment validation schema
const AssignCategorySchema = z.object({
    patientId: z.string().uuid("Invalid patient ID"),
    categoryId: z.string().uuid("Invalid category ID")
});

/**
 * Helper function to safely extract category name
 */
function getCategoryName(programCategories: any): string {
    if (Array.isArray(programCategories) && programCategories.length > 0) {
        return programCategories[0].name || "Unknown Category";
    }
    if (programCategories && typeof programCategories === 'object') {
        return programCategories.name || "Unknown Category";
    }
    return "Unknown Category";
}

/**
 * Retrieve all patients from the database
 * with optional filtering by name and category
 */
export async function getAllPatients(
    searchTerm?: string,
    categoryId?: string
): Promise<ActionResponse<Patient[]>> {
    try {
        await requireAdmin();

        const supabase = await createClient();

        let query = supabase
            .from("users")
            .select(`
                id, 
                email, 
                first_name, 
                last_name, 
                is_active, 
                created_at, 
                date_of_birth, 
                gender, 
                phone, 
                role
            `)
            .eq("role", "patient")
            .order("created_at", { ascending: false });

        if (searchTerm) {
            query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Database error:", error);
            throw error;
        }

        if (!data) {
            return { success: true, data: [] };
        }

        const patients = data.map(patient => ({
            ...patient,
            category: null
        }));

        return { success: true, data: patients };
    } catch (error) {
        console.error("Error in getAllPatients:", error);
        return handleServerError(error);
    }
}

/**
 * Get a single patient by ID
 */
export async function getPatientById(id: string): Promise<ActionResponse<Patient>> {
    try {
        await requireAdmin();

        const supabase = await createClient();

        const { data: userData, error: userError } = await supabase
            .from("users")
            .select(`
                id, 
                email, 
                first_name, 
                last_name, 
                is_active, 
                created_at, 
                date_of_birth, 
                gender, 
                phone, 
                role
            `)
            .eq("id", id)
            .eq("role", "patient")
            .single();

        if (userError) {
            throw userError;
        }

        if (!userData) {
            throw new Error("Patient not found");
        }

        const patient: Patient = {
            ...userData,
            category: null
        };

        try {
            const { data: categoryData, error: categoryError } = await supabase
                .from("patient_categories")
                .select("category_id")
                .eq("patient_id", id)
                .maybeSingle();

            if (!categoryError && categoryData && categoryData.category_id) {
                const { data: categoryDetails } = await supabase
                    .from("program_categories")
                    .select("id, name")
                    .eq("id", categoryData.category_id)
                    .single();

                if (categoryDetails) {
                    patient.category = {
                        id: categoryDetails.id,
                        name: categoryDetails.name
                    };
                }
            }
        } catch (catError) {
            console.error("Error fetching patient category:", catError);
        }

        return { success: true, data: patient };
    } catch (error) {
        console.error("Error in getPatientById:", error);
        return handleServerError(error);
    }
}

/**
 * Assign a patient to a treatment category and automatically enroll in all programs
 */
export async function assignPatientToCategory(
    patientId: string,
    categoryId: string
): Promise<ActionResponse<any>> {
    try {
        const validData = z.object({
            patientId: z.string().uuid("Invalid patient ID"),
            categoryId: z.string().uuid("Invalid category ID")
        }).parse({ patientId, categoryId });

        const { user } = await requireAdmin();
        const supabase = await createClient();

        const { data: patient, error: patientError } = await supabase
            .from("users")
            .select("id")
            .eq("id", validData.patientId)
            .eq("role", "patient")
            .single();

        if (patientError) {
            throw new Error("Patient not found");
        }

        const { data: category, error: categoryError } = await supabase
            .from("program_categories")
            .select("id, name")
            .eq("id", validData.categoryId)
            .single();

        if (categoryError) {
            throw new Error("Category not found");
        }

        const { error: deleteError } = await supabase
            .from("patient_categories")
            .delete()
            .eq("patient_id", validData.patientId);

        if (deleteError) {
            console.error("Delete error:", deleteError);
            throw deleteError;
        }

        const { data: categoryAssignment, error: assignmentError } = await supabase
            .from("patient_categories")
            .insert({
                patient_id: validData.patientId,
                category_id: validData.categoryId,
                assigned_by: user.id,
                assigned_at: new Date().toISOString()
            })
            .select()
            .single();

        if (assignmentError) {
            console.error("Insert error:", assignmentError);
            throw assignmentError;
        }

        const { data: programs, error: programsError } = await supabase
            .from("treatment_programs")
            .select("id, duration_days")
            .eq("category_id", validData.categoryId)
            .eq("is_active", true);

        if (programsError) {
            console.error("Error fetching programs:", programsError);
            throw programsError;
        }

        if (programs && programs.length > 0) {
            const startDate = new Date().toISOString().split('T')[0];

            const enrollments = programs.map(program => {
                let expectedEndDate = null;
                if (program.duration_days) {
                    const endDate = new Date();
                    endDate.setDate(endDate.getDate() + program.duration_days);
                    expectedEndDate = endDate.toISOString().split('T')[0];
                }
                return {
                    patient_id: validData.patientId,
                    program_id: program.id,
                    category_enrollment_id: categoryAssignment.id,
                    enrolled_by: user.id,
                    start_date: startDate,
                    expected_end_date: expectedEndDate,
                    status: "in_progress"
                };
            });

            const { data: enrollmentResults, error: enrollmentError } = await supabase
                .from("patient_enrollments")
                .insert(enrollments)
                .select();

            if (enrollmentError) {
                console.error("Error creating enrollments:", enrollmentError);
                throw enrollmentError;
            }

            for (const program of programs) {
                const { data: modules, error: modulesError } = await supabase
                    .from("learning_modules")
                    .select("id")
                    .eq("program_id", program.id);

                if (modulesError) {
                    console.error(`Error fetching modules for program ${program.id}:`, modulesError);
                    continue;
                }

                if (modules && modules.length > 0) {
                    const enrollment = enrollmentResults.find(e => e.program_id === program.id);

                    if (enrollment) {
                        const moduleProgressData = modules.map(module => ({
                            patient_id: validData.patientId,
                            module_id: module.id,
                            enrollment_id: enrollment.id,
                            status: "not_started"
                        }));

                        const { error: progressError } = await supabase
                            .from("module_progress")
                            .insert(moduleProgressData);

                        if (progressError) {
                            console.error(`Error creating module progress for program ${program.id}:`, progressError);
                        }
                    }
                }
            }
        }

        revalidatePath("/admin/patients");
        revalidatePath(`/admin/patients/${patientId}`);
        revalidatePath("/patient");
        revalidatePath("/patient/programs");
        revalidatePath("/patient/assessments");

        return {
            success: true,
            data: {
                categoryAssignment,
                programsEnrolled: programs?.length || 0
            }
        };
    } catch (error) {
        return handleServerError(error);
    }
}
