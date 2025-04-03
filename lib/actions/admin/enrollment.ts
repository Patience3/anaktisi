// lib/actions/admin/enrollment.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

// Define proper type for the Category and Program interfaces
interface Category {
    id: string;
    name: string;
    description?: string;
}

interface Program {
    id: string;
    title: string;
    category_id: string;
    duration_days?: number;
    description?: string;
}

// Enrollment details type
export interface EnrollmentDetails {
    id: string;
    patient_id: string;
    category_id: string;
    category_name: string;
    start_date: string;
    expected_end_date?: string;
    status: string;
    programs?: Program[];
}

// Enrollment assignment schema for categories
const CategoryEnrollmentSchema = z.object({
    patientId: z.string().uuid("Valid patient ID is required"),
    categoryId: z.string().uuid("Valid category ID is required"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
});

// Get patient's current enrollment in a category
export async function getPatientCurrentEnrollment(patientId: string): Promise<ActionResponse<EnrollmentDetails | null>> {
    try {
        // Validate the patientId
        const validPatientId = z.string().uuid("Invalid patient ID").parse(patientId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get all active categories
        const { data, error } = await supabase
            .from("program_categories")
            .select("id, name, description")
            .order("name");

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data as Category[]
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Get programs by category
export async function getProgramsByCategory(categoryId: string): Promise<ActionResponse<Program[]>> {
    try {
        // Validate the categoryId
        const validCategoryId = z.string().uuid("Invalid category ID").parse(categoryId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get all active programs in the category
        const { data, error } = await supabase
            .from("treatment_programs")
            .select("id, title, description, duration_days, category_id, is_active")
            .eq("category_id", validCategoryId)
            .eq("is_active", true)
            .order("title");

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data as Program[]
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Enroll patient in a specific program within their category
export async function enrollPatientInProgram(
    patientId: string,
    programId: string,
    categoryEnrollmentId: string
): Promise<ActionResponse<any>> {
    try {
        // Validate the inputs
        const validPatientId = z.string().uuid("Invalid patient ID").parse(patientId);
        const validProgramId = z.string().uuid("Invalid program ID").parse(programId);
        const validEnrollmentId = z.string().uuid("Invalid enrollment ID").parse(categoryEnrollmentId);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Check if patient exists
        const { data: patient, error: patientError } = await supabase
            .from("users")
            .select("id")
            .eq("id", validPatientId)
            .eq("role", "patient")
            .single();

        if (patientError) {
            throw new Error("Patient not found");
        }

        // Get program details
        const { data: program, error: programError } = await supabase
            .from("treatment_programs")
            .select("id, duration_days, title, category_id")
            .eq("id", validProgramId)
            .single();

        if (programError) {
            throw new Error("Program not found");
        }

        // Verify the program belongs to the patient's enrolled category
        const { data: categoryEnrollment, error: enrollmentError } = await supabase
            .from("patient_category_enrollments")
            .select("category_id")
            .eq("id", validEnrollmentId)
            .eq("patient_id", validPatientId)
            .single();

        if (enrollmentError) {
            throw new Error("Category enrollment not found");
        }

        if (categoryEnrollment.category_id !== program.category_id) {
            throw new Error("Program does not belong to the patient's enrolled category");
        }

        // Calculate expected end date if program has a duration
        let expectedEndDate = null;
        if (program.duration_days) {
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + program.duration_days);
            expectedEndDate = endDate.toISOString().split('T')[0];
        }

        // Create the program enrollment
        const { data: enrollment, error: createError } = await supabase
            .from("patient_enrollments")
            .insert({
                patient_id: validPatientId,
                program_id: validProgramId,
                category_enrollment_id: validEnrollmentId,
                enrolled_by: user.id,
                start_date: new Date().toISOString().split('T')[0],
                expected_end_date: expectedEndDate,
                status: "in_progress"
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        // Initialize module progress for all modules in the program
        const { data: modules, error: modulesError } = await supabase
            .from("learning_modules")
            .select("id")
            .eq("program_id", validProgramId);

        if (modulesError) {
            throw modulesError;
        }

        if (modules && modules.length > 0) {
            const moduleProgressData = modules.map(module => ({
                patient_id: validPatientId,
                module_id: module.id,
                enrollment_id: enrollment.id,
                status: "not_started"
            }));

            const { error: progressError } = await supabase
                .from("module_progress")
                .insert(moduleProgressData);

            if (progressError) {
                throw progressError;
            }
        }

        // Revalidate patient pages
        revalidatePath(`/admin/patients/${validPatientId}`);
        revalidatePath(`/patient/dashboard`);

        return {
            success: true,
            data: enrollment
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Get current active category enrollment
const { data, error } = await supabase
    .from("patient_category_enrollments")
    .select(`
                id, 
                patient_id,
                category_id,
                start_date, 
                expected_end_date,
                status,
                program_categories:category_id(id, name)
            `)
    .eq("patient_id", validPatientId)
    .in("status", ["in_progress", "assigned"])
    .single();

if (error && error.code !== 'PGRST116') { // PGRST116 is the error code for "no rows returned"
    throw error;
}

if (!data) {
    return {
        success: true,
        data: null
    };
}

// Create the enrollment response with proper type handling
const enrollment: EnrollmentDetails = {
    id: data.id,
    patient_id: data.patient_id,
    category_id: data.category_id,
    category_name: "Unknown Category", // Default value
    start_date: data.start_date,
    expected_end_date: data.expected_end_date,
    status: data.status,
    programs: []
};

// Try to get category details if available
if (data.program_categories &&
    typeof data.program_categories === 'object' &&
    data.program_categories !== null) {

    // If program_categories has name property, use it
    if ('name' in data.program_categories && data.program_categories.name) {
        enrollment.category_name = String(data.program_categories.name);
    }
}

// Fetch all programs in this category
const { data: programsData, error: programsError } = await supabase
    .from("treatment_programs")
    .select("id, title, description, duration_days, category_id")
    .eq("category_id", data.category_id)
    .eq("is_active", true);

if (!programsError && programsData) {
    enrollment.programs = programsData;
}

// Return the typed enrollment data
return {
    success: true,
    data: enrollment
};
} catch (error) {
    return handleServerError(error);
}
}

// Assign patient to a program category
export async function assignPatientToCategory(params: z.infer<typeof CategoryEnrollmentSchema>): Promise<ActionResponse<any>> {
    try {
        // Validate the data
        const validParams = CategoryEnrollmentSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Check if patient exists
        const { data: patient, error: patientError } = await supabase
            .from("users")
            .select("id")
            .eq("id", validParams.patientId)
            .eq("role", "patient")
            .single();

        if (patientError) {
            throw new Error("Patient not found");
        }

        // Check if category exists
        const { data: category, error: categoryError } = await supabase
            .from("program_categories")
            .select("id, name")
            .eq("id", validParams.categoryId)
            .single();

        if (categoryError) {
            throw new Error("Category not found");
        }

        // Check if patient is already enrolled in any category
        const { data: existingEnrollment, error: enrollmentError } = await supabase
            .from("patient_category_enrollments")
            .select("id, status")
            .eq("patient_id", validParams.patientId)
            .not("status", "eq", "completed")
            .not("status", "eq", "dropped");

        if (enrollmentError && enrollmentError.code !== 'PGRST116') {
            throw enrollmentError;
        }

        // If patient is already enrolled, update the existing enrollment
        if (existingEnrollment && existingEnrollment.length > 0) {
            // First mark existing enrollment as dropped
            const { error: updateError } = await supabase
                .from("patient_category_enrollments")
                .update({
                    status: "dropped",
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingEnrollment[0].id);

            if (updateError) {
                throw updateError;
            }

            // Clear existing program progress data
            const { error: progEnrollError } = await supabase
                .from("patient_enrollments")
                .update({
                    status: "dropped",
                    updated_at: new Date().toISOString()
                })
                .eq("patient_id", validParams.patientId)
                .in("status", ["assigned", "in_progress"]);

            if (progEnrollError) {
                console.error("Error updating program enrollments:", progEnrollError);
                // Continue even if this fails
            }

            // Clear existing module progress
            const { error: progressError } = await supabase
                .from("module_progress")
                .delete()
                .eq("patient_id", validParams.patientId);

            if (progressError) {
                console.error("Error clearing module progress:", progressError);
                // Continue even if this fails
            }
        }

        // Create new category enrollment
        const { data: enrollment, error: createError } = await supabase
            .from("patient_category_enrollments")
            .insert({
                patient_id: validParams.patientId,
                category_id: validParams.categoryId,
                enrolled_by: user.id,
                start_date: validParams.startDate,
                status: "in_progress"
            })
            .select()
            .single();

        if (createError) {
            throw createError;
        }

        // Revalidate patients and programs pages
        revalidatePath("/admin/patients");
        revalidatePath(`/admin/patients/${validParams.patientId}`);

        return {
            success: true,
            data: enrollment
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Get all available program categories
export async function getAllCategories(): Promise<ActionResponse<Category[]>> {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();