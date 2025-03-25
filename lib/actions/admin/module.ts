// lib/actions/admin/module.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import { CreateModuleSchema } from "@/lib/validations";

// Define the Module type for our application
export type Module = {
    id: string;
    program_id: string;
    title: string;
    description: string;
    sequence_number: number;
    estimated_minutes: number | null;
    is_required: boolean;
    created_by: string;
    created_by_name?: string; // From join with users table
    created_at: string;
    updated_at: string;
    total_content_items?: number; // Count of related content
};

/**
 * Retrieve all modules for a program
 */
export async function getAllModules(programId: string): Promise<ActionResponse<Module[]>> {
    try {
        // Validate the programId
        const validProgramId = z.string().uuid("Invalid program ID").parse(programId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get modules with creator information and content count
        const { data, error } = await supabase
            .from("learning_modules")
            .select(`
                *,
                created_by:users(first_name, last_name),
                content_items:content_items(count)
            `)
            .eq("program_id", validProgramId)
            .order("sequence_number", { ascending: true });

        if (error) {
            throw error;
        }

        // Transform the data to include joined fields and counts
        const modules = data.map(module => ({
            ...module,
            created_by_name: module.created_by ?
                `${module.created_by.first_name} ${module.created_by.last_name}` :
                undefined,
            total_content_items: module.content_items?.length || 0
        }));

        return {
            success: true,
            data: modules as Module[]
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get a single module by ID
 */
export async function getModuleById(moduleId: string): Promise<ActionResponse<Module>> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get module with creator information and content count
        const { data, error } = await supabase
            .from("learning_modules")
            .select(`
                *,
                created_by:users(first_name, last_name),
                content_items:content_items(count)
            `)
            .eq("id", validId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Module not found");
        }

        // Transform the data for the frontend
        const module = {
            ...data,
            created_by_name: data.created_by ?
                `${data.created_by.first_name} ${data.created_by.last_name}` :
                undefined,
            total_content_items: data.content_items?.length || 0
        };

        return {
            success: true,
            data: module as Module
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get the next available sequence number for a program
 */
export async function getNextSequenceNumber(programId: string): Promise<ActionResponse<number>> {
    try {
        // Validate the programId
        const validProgramId = z.string().uuid("Invalid program ID").parse(programId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the highest sequence number currently in use
        const { data, error } = await supabase
            .from("learning_modules")
            .select("sequence_number")
            .eq("program_id", validProgramId)
            .order("sequence_number", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        // If there are no modules yet, start at 1
        const nextSequence = data.length > 0 ? data[0].sequence_number + 1 : 1;

        return {
            success: true,
            data: nextSequence
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new module
 */
export async function createModule(params: z.infer<typeof CreateModuleSchema>): Promise<ActionResponse<Module>> {
    try {
        // Validate the data
        const validParams = CreateModuleSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Create the new module
        const { data, error } = await supabase
            .from("learning_modules")
            .insert({
                title: validParams.title,
                description: validParams.description,
                program_id: validParams.programId,
                sequence_number: validParams.sequenceNumber,
                estimated_minutes: validParams.estimatedMinutes || null,
                is_required: validParams.isRequired,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the modules list
        revalidatePath(`/admin/programs/${validParams.programId}/modules`);

        return {
            success: true,
            data: data as Module
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update an existing module
 */
export async function updateModule(moduleId: string, params: z.infer<typeof CreateModuleSchema>): Promise<ActionResponse<Module>> {
    try {
        // Validate the id and data
        const validId = z.string().uuid("Invalid ID format").parse(moduleId);
        const validParams = CreateModuleSchema.parse(params);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update the module
        const { data, error } = await supabase
            .from("learning_modules")
            .update({
                title: validParams.title,
                description: validParams.description,
                sequence_number: validParams.sequenceNumber,
                estimated_minutes: validParams.estimatedMinutes || null,
                is_required: validParams.isRequired,
                updated_at: new Date().toISOString()
            })
            .eq("id", validId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the paths
        revalidatePath(`/admin/programs/${validParams.programId}/modules`);
        revalidatePath(`/admin/programs/${validParams.programId}/modules/${validId}`);

        return {
            success: true,
            data: data as Module
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Delete a module
 */
export async function deleteModule(moduleId: string, programId: string): Promise<ActionResponse> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(moduleId);
        const validProgramId = z.string().uuid("Invalid program ID").parse(programId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Check if the module has any content items
        const { count, error: countError } = await supabase
            .from("content_items")
            .select("id", { count: "exact", head: true })
            .eq("module_id", validId);

        if (countError) {
            throw countError;
        }

        // If content items exist, don't allow deletion
        if (count && count > 0) {
            return {
                success: false,
                error: {
                    message: "Cannot delete module with existing content items. Remove content items first."
                },
                status: 400
            };
        }

        // Perform the deletion
        const { error } = await supabase
            .from("learning_modules")
            .delete()
            .eq("id", validId);

        if (error) {
            throw error;
        }

        // After deletion, we need to reorder the remaining modules to ensure sequence numbers are consecutive
        await reorderRemainingModules(validProgramId);

        // Refresh the modules list
        revalidatePath(`/admin/programs/${validProgramId}/modules`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update module sequence (reorder modules)
 */
export async function updateModuleSequence(moduleId: string, newSequence: number, programId: string): Promise<ActionResponse> {
    try {
        // Validate inputs
        const validId = z.string().uuid("Invalid ID format").parse(moduleId);
        const validProgramId = z.string().uuid("Invalid program ID").parse(programId);
        const validSequence = z.number().int().positive().parse(newSequence);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // First, get the current module to know its current sequence
        const { data: currentModule, error: fetchError } = await supabase
            .from("learning_modules")
            .select("sequence_number")
            .eq("id", validId)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        if (!currentModule) {
            throw new Error("Module not found");
        }

        const currentSequence = currentModule.sequence_number;

        // If the sequence hasn't changed, no need to do anything
        if (currentSequence === validSequence) {
            return { success: true };
        }

        // Create a transaction by using multiple queries
        if (currentSequence < validSequence) {
            // Moving down: Decrement sequence numbers for modules between current+1 and new
            const { error: updateError } = await supabase
                .from("learning_modules")
                .update({ sequence_number: supabase.rpc('decrement_sequence') })
                .eq("program_id", validProgramId)
                .gt("sequence_number", currentSequence)
                .lte("sequence_number", validSequence);

            if (updateError) {
                throw updateError;
            }
        } else {
            // Moving up: Increment sequence numbers for modules between new and current-1
            const modulesToUpdate = await supabase
                .from("learning_modules")
                .select("id, sequence_number")
                .eq("program_id", validProgramId)
                .gte("sequence_number", validSequence)
                .lt("sequence_number", currentSequence);

            if (modulesToUpdate.error) {
                throw modulesToUpdate.error;
            }

            // Update each module one by one
            for (const module of modulesToUpdate.data || []) {
                const { error } = await supabase
                    .from("learning_modules")
                    .update({ sequence_number: module.sequence_number + 1 })
                    .eq("id", module.id);

                if (error) {
                    throw error;
                }
            }
        }

        // Update the module's sequence to the new value
        const { error: moduleUpdateError } = await supabase
            .from("learning_modules")
            .update({ sequence_number: validSequence })
            .eq("id", validId);

        if (moduleUpdateError) {
            throw moduleUpdateError;
        }

        // Refresh the modules list
        revalidatePath(`/admin/programs/${validProgramId}/modules`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Helper function to reorder remaining modules after a deletion
 */
async function reorderRemainingModules(programId: string): Promise<void> {
    const supabase = await createClient();

    // Get all remaining modules for the program, ordered by current sequence
    const { data: modules, error } = await supabase
        .from("learning_modules")
        .select("id, sequence_number")
        .eq("program_id", programId)
        .order("sequence_number");

    if (error) {
        throw error;
    }

    // Update each module with a new, consecutive sequence number
    for (let i = 0; i < modules.length; i++) {
        const newSequence = i + 1;
        if (modules[i].sequence_number !== newSequence) {
            await supabase
                .from("learning_modules")
                .update({ sequence_number: newSequence })
                .eq("id", modules[i].id);
        }
    }
}