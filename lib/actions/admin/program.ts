// lib/actions/admin/program.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { CreateProgramSchema } from "@/lib/validations";
import { z } from "zod";

// Define the Program type for our application
export type Program = {
    id: string;
    title: string;
    description: string;
    category_id: string;
    category_name?: string; // From join with categories table
    duration_days: number | null;
    is_self_paced: boolean;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    created_by: string;
    created_by_name?: string; // From join with users table
    total_modules?: number; // Count of related modules
    total_enrollments?: number; // Count of related enrollments
};

// Schema for program ID validation
const ProgramIdSchema = z.object({
    id: z.string().uuid("Invalid program ID format")
});

/**
 * Retrieve all programs from the database
 */
export async function getAllPrograms(): Promise<ActionResponse<Program[]>> {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get programs with category information
        const { data, error } = await supabase
            .from("treatment_programs")
            .select(`
                *,
                program_categories(name),
                created_by:users(first_name, last_name)
            `)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        // Transform the data to flatten the joined fields
        const programs = data.map(program => ({
            ...program,
            category_name: program.program_categories?.name,
            created_by_name: program.created_by ?
                `${program.created_by.first_name} ${program.created_by.last_name}` :
                undefined
        }));

        return {
            success: true,
            data: programs as Program[]
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Retrieve all categories for program creation/editing
 */
export async function getAllCategories(): Promise<ActionResponse<{id: string, name: string}[]>> {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get all active categories
        const { data, error } = await supabase
            .from("program_categories")
            .select("id, name")
            .order("name");

        if (error) {
            throw error;
        }

        return {
            success: true,
            data
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get a single program by ID with all related data
 */
export async function getProgramById(id: string): Promise<ActionResponse<Program>> {
    try {
        // Validate the id
        const validParams = ProgramIdSchema.parse({ id });

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get program with related data counts
        const { data, error } = await supabase
            .from("treatment_programs")
            .select(`
                *,
                program_categories(name),
                created_by:users(first_name, last_name),
                modules:learning_modules(count),
                enrollments:patient_enrollments(count)
            `)
            .eq("id", validParams.id)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Program not found");
        }

        // Transform the data for the frontend
        const program = {
            ...data,
            category_name: data.program_categories?.name,
            created_by_name: data.created_by ?
                `${data.created_by.first_name} ${data.created_by.last_name}` :
                undefined,
            total_modules: data.modules?.[0]?.count || 0,
            total_enrollments: data.enrollments?.[0]?.count || 0
        };

        return {
            success: true,
            data: program as Program
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new program
 */
export async function createProgram(params: z.infer<typeof CreateProgramSchema>): Promise<ActionResponse<Program>> {
    try {
        // Validate the data
        const validParams = CreateProgramSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Create the new program
        const { data, error } = await supabase
            .from("treatment_programs")
            .insert({
                title: validParams.title,
                description: validParams.description,
                category_id: validParams.categoryId,
                duration_days: validParams.durationDays || null,
                is_self_paced: validParams.isSelfPaced,
                created_by: user.id,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the programs list
        revalidatePath("/admin/programs");

        return {
            success: true,
            data: data as Program
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update an existing program
 */
export async function updateProgram(id: string, params: z.infer<typeof CreateProgramSchema>): Promise<ActionResponse<Program>> {
    try {
        // Validate the id and data
        const validId = ProgramIdSchema.parse({ id });
        const validParams = CreateProgramSchema.parse(params);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update the program
        const { data, error } = await supabase
            .from("treatment_programs")
            .update({
                title: validParams.title,
                description: validParams.description,
                category_id: validParams.categoryId,
                duration_days: validParams.durationDays || null,
                is_self_paced: validParams.isSelfPaced,
                updated_at: new Date().toISOString()
            })
            .eq("id", validId.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the programs list and program detail page
        revalidatePath("/admin/programs");
        revalidatePath(`/admin/programs/${id}`);

        return {
            success: true,
            data: data as Program
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update program active status
 */
export async function updateProgramStatus(id: string, isActive: boolean): Promise<ActionResponse> {
    try {
        // Validate the id
        const validParams = ProgramIdSchema.parse({ id });

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update the program status
        const { error } = await supabase
            .from("treatment_programs")
            .update({
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq("id", validParams.id);

        if (error) {
            throw error;
        }

        // Refresh the programs list and program detail page
        revalidatePath("/admin/programs");
        revalidatePath(`/admin/programs/${id}`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Delete a program (soft delete by setting is_active to false)
 */
export async function deleteProgram(id: string): Promise<ActionResponse> {
    try {
        // Validate the id
        const validParams = ProgramIdSchema.parse({ id });

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Check if program has any enrollments
        const { count, error: countError } = await supabase
            .from("patient_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("program_id", validParams.id);

        if (countError) {
            throw countError;
        }

        // If enrollments exist, don't allow deletion
        if (count && count > 0) {
            return {
                success: false,
                error: {
                    message: "Cannot delete program with existing enrollments. Deactivate it instead."
                },
                status: 400
            };
        }

        // Perform the deletion (or soft deletion)
        // Option 1: Hard delete if no enrollments
        const { error } = await supabase
            .from("treatment_programs")
            .delete()
            .eq("id", validParams.id);

        // Option 2: Soft delete (uncomment if preferred)
        // const { error } = await supabase
        //     .from("programs")
        //     .update({
        //         is_active: false,
        //         updated_at: new Date().toISOString()
        //     })
        //     .eq("id", validParams.id);

        if (error) {
            throw error;
        }

        // Refresh the programs list
        revalidatePath("/admin/programs");

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}