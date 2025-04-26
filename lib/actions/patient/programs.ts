"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";
import { z } from "zod";

// Define typed interfaces that match the database schema
export interface PatientCategory {
    id: string;
    category_id: string;
    assigned_at: string;
    patient_id: string;
    category: {
        id: string;
        name: string;
        description: string | null;
    };
}

export interface Program {
    id: string;
    title: string;
    description: string | null;
    duration_days: number | null;
    is_self_paced: boolean;
    is_active: boolean;
    created_at: string;
    category_id: string;
    enrollment?: PatientProgramEnrollment | null;
}

export interface PatientProgramEnrollment {
    id: string;
    patient_id: string;
    program_id: string;
    category_enrollment_id?: string;
    start_date: string;
    expected_end_date: string | null;
    completed_date: string | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'dropped';
    created_at: string;
}

export interface Module {
    id: string;
    program_id: string;
    title: string;
    description: string | null;
    sequence_number: number;
    estimated_minutes: number | null;
    is_required: boolean;
    created_at: string;
    progress?: ModuleProgress | null;
    total_content_items?: number;
}

export interface ModuleProgress {
    id: string;
    patient_id: string;
    module_id: string;
    enrollment_id: string;
    status: 'not_started' | 'in_progress' | 'completed';
    started_at: string | null;
    completed_at: string | null;
    time_spent_seconds: number;
}

export interface ContentItem {
    id: string;
    module_id: string;
    title: string;
    content_type: 'video' | 'text' | 'document' | 'link' | 'assessment';
    content: string;
    sequence_number: number;
    created_at: string;
}

// Validation schemas
const UpdateModuleProgressSchema = z.object({
    moduleId: z.string().uuid("Invalid module ID"),
    status: z.enum(['in_progress', 'completed']),
});

/**
 * Get patient's assigned treatment category
 */
export async function getPatientCategory(): Promise<ActionResponse<PatientCategory | null>> {
    try {
        // Get the authenticated user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return {
                success: false,
                error: {
                    message: "Not authenticated"
                },
                status: 401
            };
        }

        // Get user profile to verify it's a patient
        const profile = await getUserProfile(authUser.id);

        if (!profile || profile.role !== 'patient') {
            return {
                success: false,
                error: {
                    message: "Access denied. Patient role required."
                },
                status: 403
            };
        }

        const supabase = await createClient();

        // Using a simpler query approach
        const { data: categoryData, error: categoryError } = await supabase
            .from("patient_categories")
            .select("id, category_id, assigned_at, patient_id")
            .eq("patient_id", authUser.id)
            .single();

        if (categoryError) {
            if (categoryError.code === 'PGRST116') {
                return {
                    success: true,
                    data: null
                };
            }
            throw categoryError;
        }

        // Fetch category details separately
        const { data: categoryDetails, error: detailsError } = await supabase
            .from("program_categories")
            .select("id, name, description")
            .eq("id", categoryData.category_id)
            .single();

        if (detailsError) {
            throw detailsError;
        }

        // Combine the data
        const patientCategory: PatientCategory = {
            ...categoryData,
            category: categoryDetails
        };

        return {
            success: true,
            data: patientCategory
        };
    } catch (error) {
        console.error("Error in getPatientCategory:", error);
        return handleServerError(error);
    }
}

/**
 * Get programs for patient's category that they are ALREADY ENROLLED IN
 * Patients cannot enroll themselves - only view programs they've been enrolled in by admins
 */
export async function getCategoryPrograms(categoryId: string): Promise<ActionResponse<Program[]>> {
    try {
        // Get the authenticated user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return {
                success: false,
                error: {
                    message: "Not authenticated"
                },
                status: 401
            };
        }

        const profile = await getUserProfile(authUser.id);

        if (!profile || profile.role !== 'patient') {
            return {
                success: false,
                error: {
                    message: "Access denied. Patient role required."
                },
                status: 403
            };
        }

        const supabase = await createClient();

        // If categoryId is "all", get the patient's category first
        let effectiveCategoryId = categoryId;
        if (categoryId === "all") {
            const { data: patientCategory, error: categoryError } = await supabase
                .from("patient_categories")
                .select("category_id")
                .eq("patient_id", authUser.id)
                .maybeSingle();

            if (categoryError && categoryError.code !== 'PGRST116') {
                throw categoryError;
            }

            if (!patientCategory) {
                return {
                    success: true,
                    data: []
                };
            }

            effectiveCategoryId = patientCategory.category_id;
        }

        // First get patient's enrollments
        const { data: enrollments, error: enrollmentError } = await supabase
            .from("patient_enrollments")
            .select(`
                id,
                patient_id,
                program_id,
                start_date,
                expected_end_date,
                completed_date,
                status,
                created_at
            `)
            .eq("patient_id", authUser.id)
            .not("status", "eq", "dropped");

        if (enrollmentError) {
            throw enrollmentError;
        }

        if (!enrollments || enrollments.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        // Get program IDs from enrollments
        const programIds = enrollments.map(e => e.program_id);

        // Get all programs that match the category AND are in the enrollment list
        const { data: programs, error } = await supabase
            .from("treatment_programs")
            .select(`
                id, 
                title,
                description,
                duration_days,
                is_self_paced,
                is_active,
                created_at,
                category_id
            `)
            .eq("category_id", effectiveCategoryId)
            .in("id", programIds)
            .order("title");

        if (error) {
            throw error;
        }

        if (!programs || programs.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        // Map enrollments to programs with type safety
        const programsWithEnrollment: Program[] = programs.map(program => {
            const enrollment = enrollments.find(e => e.program_id === program.id) || null;
            return {
                ...program,
                enrollment: enrollment as PatientProgramEnrollment | null
            };
        });

        return {
            success: true,
            data: programsWithEnrollment
        };
    } catch (error) {
        console.error("Error in getCategoryPrograms:", error);
        return handleServerError(error);
    }
}

/**
 * Get modules for a specific program with proper TypeScript typing
 */
export async function getProgramModules(programId: string): Promise<ActionResponse<Module[]>> {
    try {
        // Validate the programId
        const validProgramId = z.string().uuid("Invalid program ID").parse(programId);

        // Get the authenticated user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return {
                success: false,
                error: {
                    message: "Not authenticated"
                },
                status: 401
            };
        }

        const supabase = await createClient();

        // First check if patient is enrolled in this program - they can only view modules if enrolled
        const { data: enrollment, error: enrollmentError } = await supabase
            .from("patient_enrollments")
            .select("id")
            .eq("patient_id", authUser.id)
            .eq("program_id", validProgramId)
            .not("status", "eq", "dropped")
            .maybeSingle();

        if (enrollmentError && enrollmentError.code !== 'PGRST116') {
            throw enrollmentError;
        }

        // If not enrolled, return an error
        if (!enrollment) {
            return {
                success: false,
                error: {
                    message: "You are not enrolled in this program"
                },
                status: 403
            };
        }

        // Get modules for the program
        const { data: modules, error } = await supabase
            .from("learning_modules")
            .select(`
                id, 
                program_id,
                title,
                description,
                sequence_number,
                estimated_minutes,
                is_required,
                created_at
            `)
            .eq("program_id", validProgramId)
            .order("sequence_number");

        if (error) {
            throw error;
        }

        if (!modules || modules.length === 0) {
            return {
                success: true,
                data: []
            };
        }

        // Count content items for each module - use a different approach
        const moduleIds = modules.map(m => m.id);

        // Instead of doing a group by, run individual count queries for each module
        const contentCounts: Record<string, number> = {};

        // Alternatively, use a simpler count query by iterating through modules
        for (const moduleId of moduleIds) {
            const { count, error: countError } = await supabase
                .from("content_items")
                .select("*", { count: "exact", head: true })
                .eq("module_id", moduleId);

            if (!countError && count !== null) {
                contentCounts[moduleId] = count;
            }
        }

        // Get progress for modules
        const { data: progress, error: progressError } = await supabase
            .from("module_progress")
            .select(`
                id,
                patient_id,
                module_id,
                enrollment_id,
                status,
                started_at,
                completed_at,
                time_spent_seconds
            `)
            .eq("patient_id", authUser.id)
            .eq("enrollment_id", enrollment.id)
            .in("module_id", moduleIds);

        if (progressError) {
            throw progressError;
        }

        // Map progress to modules and add content counts
        const modulesWithProgress: Module[] = modules.map(module => {
            const moduleProgress = progress?.find(p => p.module_id === module.id) || null;
            const contentCount = contentCounts[module.id] || 0;

            return {
                ...module,
                progress: moduleProgress as ModuleProgress | null,
                total_content_items: contentCount
            };
        });

        return {
            success: true,
            data: modulesWithProgress
        };
    } catch (error) {
        console.error("Error in getProgramModules:", error);
        return handleServerError(error);
    }
}

/**
 * Get content items for a specific module
 */
export async function getModuleContent(moduleId: string): Promise<ActionResponse<ContentItem[]>> {
    try {
        // Validate the moduleId
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Get the authenticated user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return {
                success: false,
                error: {
                    message: "Not authenticated"
                },
                status: 401
            };
        }

        const supabase = await createClient();

        // First get the module to find the program
        const { data: module, error: moduleError } = await supabase
            .from("learning_modules")
            .select("program_id")
            .eq("id", validModuleId)
            .single();

        if (moduleError) {
            throw moduleError;
        }

        // Check if patient is enrolled in this program
        const { data: enrollment, error: enrollmentError } = await supabase
            .from("patient_enrollments")
            .select("id")
            .eq("patient_id", authUser.id)
            .eq("program_id", module.program_id)
            .not("status", "eq", "dropped")
            .maybeSingle();

        if (enrollmentError) {
            throw enrollmentError;
        }

        // If not enrolled, return an error
        if (!enrollment) {
            return {
                success: false,
                error: {
                    message: "You are not enrolled in this program"
                },
                status: 403
            };
        }

        // Get content items for the module
        const { data, error } = await supabase
            .from("content_items")
            .select(`
                id, 
                module_id,
                title,
                content_type,
                content,
                sequence_number,
                created_at
            `)
            .eq("module_id", validModuleId)
            .order("sequence_number");

        if (error) {
            throw error;
        }

        // Update module progress to in_progress if it's not already in_progress or completed
        const { data: existingProgress, error: checkProgressError } = await supabase
            .from("module_progress")
            .select("id, status")
            .eq("patient_id", authUser.id)
            .eq("module_id", validModuleId)
            .eq("enrollment_id", enrollment.id)
            .maybeSingle();

        if (!checkProgressError && (!existingProgress || existingProgress.status === 'not_started')) {
            // Mark as in progress if not already started
            const now = new Date().toISOString();
            if (existingProgress) {
                // Update existing record
                await supabase
                    .from("module_progress")
                    .update({
                        status: 'in_progress',
                        started_at: now
                    })
                    .eq("id", existingProgress.id);
            } else {
                // Create new record
                await supabase
                    .from("module_progress")
                    .insert({
                        patient_id: authUser.id,
                        module_id: validModuleId,
                        enrollment_id: enrollment.id,
                        status: 'in_progress',
                        started_at: now
                    });
            }

            // Revalidate paths
            revalidatePath(`/patient/programs/${module.program_id}`);
        }

        return {
            success: true,
            data: data as ContentItem[] || []
        };
    } catch (error) {
        console.error("Error in getModuleContent:", error);
        return handleServerError(error);
    }
}

/**
 * Update module progress status
 */
export async function updateModuleProgress(
    moduleId: string,
    status: 'in_progress' | 'completed'
): Promise<ActionResponse<ModuleProgress>> {
    try {
        // Validate the input data
        const validData = UpdateModuleProgressSchema.parse({
            moduleId,
            status
        });

        // Get the authenticated user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return {
                success: false,
                error: {
                    message: "Not authenticated"
                },
                status: 401
            };
        }

        const supabase = await createClient();

        // First get the module to find the program
        const { data: module, error: moduleError } = await supabase
            .from("learning_modules")
            .select("program_id")
            .eq("id", validData.moduleId)
            .single();

        if (moduleError) {
            throw moduleError;
        }

        // Get the enrollment for this program
        const { data: enrollment, error: enrollError } = await supabase
            .from("patient_enrollments")
            .select("id")
            .eq("patient_id", authUser.id)
            .eq("program_id", module.program_id)
            .not("status", "eq", "dropped")
            .single();

        if (enrollError) {
            throw enrollError;
        }

        const now = new Date().toISOString();
        const updateData: Record<string, any> = {
            status: validData.status
        };

        // Set the appropriate timestamp based on status
        if (validData.status === 'in_progress') {
            updateData.started_at = now;
        } else if (validData.status === 'completed') {
            updateData.completed_at = now;
        }

        // Update or create the progress record
        const { data: existingProgress, error: checkError } = await supabase
            .from("module_progress")
            .select("id")
            .eq("patient_id", authUser.id)
            .eq("module_id", validData.moduleId)
            .eq("enrollment_id", enrollment.id)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }

        let progress;

        if (existingProgress) {
            // Update existing record
            const { data: updatedProgress, error: updateError } = await supabase
                .from("module_progress")
                .update(updateData)
                .eq("id", existingProgress.id)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            progress = updatedProgress;
        } else {
            // Create new record
            const { data: newProgress, error: insertError } = await supabase
                .from("module_progress")
                .insert({
                    patient_id: authUser.id,
                    module_id: validData.moduleId,
                    enrollment_id: enrollment.id,
                    ...updateData
                })
                .select()
                .single();

            if (insertError) {
                throw insertError;
            }

            progress = newProgress;
        }

        // If module is completed, check if all modules are completed
        if (validData.status === 'completed') {
            // Get all modules for this program
            const { data: allModules, error: allModulesError } = await supabase
                .from("learning_modules")
                .select("id, is_required")
                .eq("program_id", module.program_id);

            if (allModulesError) {
                throw allModulesError;
            }

            // Get progress for all modules
            const { data: allProgress, error: allProgressError } = await supabase
                .from("module_progress")
                .select("module_id, status")
                .eq("patient_id", authUser.id)
                .eq("enrollment_id", enrollment.id);

            if (allProgressError) {
                throw allProgressError;
            }

            // Check if all required modules are completed
            const requiredModules = allModules.filter(m => m.is_required).map(m => m.id);
            const completedRequiredModules = allProgress
                .filter(p => p.status === 'completed')
                .map(p => p.module_id)
                .filter(id => requiredModules.includes(id));

            // If all required modules are completed, mark the program as completed
            if (requiredModules.length > 0 && completedRequiredModules.length === requiredModules.length) {
                const { error: programUpdateError } = await supabase
                    .from("patient_enrollments")
                    .update({
                        status: "completed",
                        completed_date: now
                    })
                    .eq("id", enrollment.id);

                if (programUpdateError) {
                    console.error("Error updating program status:", programUpdateError);
                }
            }
        }

        // Revalidate related pages
        revalidatePath(`/patient/programs/${module.program_id}`);
        revalidatePath(`/patient/programs/${module.program_id}/modules/${validData.moduleId}`);

        return {
            success: true,
            data: progress as ModuleProgress
        };
    } catch (error) {
        console.error("Error in updateModuleProgress:", error);
        return handleServerError(error);
    }
}

/**
 * Submit a mood entry
 * This is a placeholder method since actual implementation is in mood.ts
 * Redirecting to the appropriate module
 */
export async function submitMoodEntry(
    moodType: string,
    moodScore: number,
    journalEntry?: string,
    contentItemId?: string
): Promise<ActionResponse<any>> {
    try {
        // Import the actual implementation from mood.ts
        const { submitMoodEntry } = await import("./mood");

        // Call the actual implementation
        return submitMoodEntry(moodType, moodScore, journalEntry, contentItemId);
    } catch (error) {
        console.error("Error in submitMoodEntry:", error);
        return handleServerError(error);
    }
}

/**
 * Get mood entries
 * This is a placeholder method since actual implementation is in mood.ts
 * Redirecting to the appropriate module
 */
export async function getMoodEntries(limit: number = 10): Promise<ActionResponse<any[]>> {
    try {
        // Import the actual implementation from mood.ts
        const { getMoodEntries } = await import("./mood");

        // Call the actual implementation
        return getMoodEntries(limit);
    } catch (error) {
        console.error("Error in getMoodEntries:", error);
        return handleServerError(error);
    }
}