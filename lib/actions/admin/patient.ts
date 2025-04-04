// lib/actions/admin/patient.ts
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
    // Handle if it's an array
    if (Array.isArray(programCategories) && programCategories.length > 0) {
        return programCategories[0].name || "Unknown Category";
    }

    // Handle if it's an object
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
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Start with a simpler query without the complex joins
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

        // Apply name search filter if provided
        if (searchTerm) {
            query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        // Get the results
        const { data, error } = await query;

        if (error) {
            console.error("Database error:", error);
            throw error;
        }

        if (!data) {
            return {
                success: true,
                data: []
            };
        }

        // Get categories in a separate query if needed
        const patients = data.map(patient => ({
            ...patient,
            category: null // We'll fetch this separately if needed
        }));

        // Return the patients without categories for now
        return {
            success: true,
            data: patients
        };
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
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        const { data, error } = await supabase
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
                role,
                patient_categories(
                    id, 
                    category_id, 
                    program_categories(id, name)
                )
            `)
            .eq("id", id)
            .eq("role", "patient")
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Patient not found");
        }

        let category = null;

        // Get the active category if any
        if (data.patient_categories &&
            Array.isArray(data.patient_categories) &&
            data.patient_categories.length > 0) {

            const activeCategory = data.patient_categories[0];

            if (activeCategory && activeCategory.program_categories) {
                category = {
                    id: activeCategory.category_id,
                    name: getCategoryName(activeCategory.program_categories)
                };
            }
        }

        // Create the patient object with category info
        const patient: Patient = {
            ...data,
            category
        };

        return {
            success: true,
            data: patient
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update patient active status
 */
export async function updatePatientStatus(
    patientId: string,
    isActive: boolean
): Promise<ActionResponse<{ updated: boolean }>> {
    try {
        // Validate input
        const validData = UpdatePatientStatusSchema.parse({ patientId, isActive });

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        const { error } = await supabase
            .from("users")
            .update({
                is_active: validData.isActive,
                updated_at: new Date().toISOString()
            })
            .eq("id", validData.patientId)
            .eq("role", "patient");

        if (error) {
            throw error;
        }

        // Revalidate the patients page to refresh the data
        revalidatePath("/admin/patients");
        revalidatePath(`/admin/patients/${patientId}`);

        return {
            success: true,
            data: { updated: true }
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update patient information
 */
export async function updatePatient(
    data: z.infer<typeof EditPatientSchema>
): Promise<ActionResponse<{ updated: boolean }>> {
    try {
        // Validate the patient data
        const validData = EditPatientSchema.parse(data);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update patient data
        const { error } = await supabase
            .from("users")
            .update({
                first_name: validData.firstName,
                last_name: validData.lastName,
                email: validData.email,
                is_active: validData.isActive,
                date_of_birth: validData.dateOfBirth || null,
                gender: validData.gender || null,
                phone: validData.phone || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", validData.patientId)
            .eq("role", "patient");

        if (error) {
            throw error;
        }

        // Revalidate the patients pages to refresh the data
        revalidatePath("/admin/patients");
        revalidatePath(`/admin/patients/${validData.patientId}`);
        revalidatePath(`/admin/patients/${validData.patientId}/edit`);

        return {
            success: true,
            data: { updated: true }
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Assign a patient to a treatment category
 */
export async function assignPatientToCategory(
    patientId: string,
    categoryId: string
): Promise<ActionResponse<any>> {
    try {
        // Validate the data
        const validData = AssignCategorySchema.parse({ patientId, categoryId });

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // First, remove any existing category assignments for this patient
        const { error: deleteError } = await supabase
            .from("patient_categories")
            .delete()
            .eq("patient_id", validData.patientId);

        if (deleteError) {
            console.error("Delete error:", deleteError);
            throw deleteError;
        }

        // Create the new category assignment
        const { data, error } = await supabase
            .from("patient_categories")
            .insert({
                patient_id: validData.patientId,
                category_id: validData.categoryId,
                assigned_by: user.id,
                assigned_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error("Insert error:", error);
            throw error;
        }

        // Revalidate the patients page to refresh the data
        revalidatePath("/admin/patients");
        revalidatePath(`/admin/patients/${patientId}`);

        return {
            success: true,
            data
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get available categories for filtering patient list
 */
export async function getCategoriesForFilter(): Promise<ActionResponse<{id: string, name: string}[]>> {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("program_categories")
            .select("id, name")
            .order("name");

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data || []
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new patient account
 */
export async function createPatientAccount(
    data: z.infer<typeof CreatePatientSchema> & { programId?: string }
): Promise<ActionResponse<{ tempPassword: string }>> {
    try {
        // Ensure the user is an admin
        const { user: adminUser } = await requireAdmin();

        // Validate patient data
        const validData = CreatePatientSchema.parse(data);

        const supabase = await createClient();

        // Generate a temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        // Create the user account in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: validData.email,
            password: tempPassword,
            email_confirm: true, // Skip email confirmation
        });

        if (authError) {
            throw authError;
        }

        if (!authData.user) {
            throw new Error("Failed to create user account");
        }

        // Create the user profile in your database
        const { error: profileError } = await supabase
            .from("users")
            .update({
                first_name: validData.firstName,
                last_name: validData.lastName,
                date_of_birth: validData.dateOfBirth || null,
                gender: validData.gender || null,
                phone: validData.phone || null,
                role: "patient",
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq("id", authData.user.id);

        if (profileError) {
            // If profile creation fails, attempt to delete the auth user to avoid orphaned accounts
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw profileError;
        }

        // If programId is provided, enroll the patient in the program
        if (data.programId) {
            // Implementation for program enrollment would go here
        }

        // Revalidate the patients list
        revalidatePath("/admin/patients");

        return {
            success: true,
            data: { tempPassword }
        };
    } catch (error) {
        return handleServerError(error);
    }
}