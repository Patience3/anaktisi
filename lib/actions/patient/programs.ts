// lib/actions/patient/programs.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { handleServerError } from "@/lib/handlers/error";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";

// Types for better type safety
export interface PatientCategory {
    id: string;
    category_id: string;
    assigned_at: string;
    category: {
        id: string;
        name: string;
        description: string;
    };
}

export interface Program {
    id: string;
    title: string;
    description: string;
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
    description: string;
    sequence_number: number;
    estimated_minutes: number | null;
    is_required: boolean;
    created_at: string;
    progress?: ModuleProgress | null;
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

        // Get patient's assigned category with category details
        const { data, error } = await supabase
            .from("patient_categories")
            .select(`
                id, 
                category_id, 
                assigned_at,
                category:program_categories(
                    id, 
                    name, 
                    description
                )
            `)
            .eq("patient_id", authUser.id)
            .single();

        if (error) {
            // If no category is found, return null without error
            if (error.code === 'PGRST116') {
                return {
                    success: true,
                    data: null
                };
            }
            throw error;
        }

        return {
            success: true,
            data: data as PatientCategory
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get programs for patient's category
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

        // First, get all programs in the category
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
            .eq("category_id", categoryId)
            .eq("is_active", true)
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

        // Then get patient's enrollments for these programs
        const programIds = programs.map(p => p.id);
        const { data: enrollments, error: enrollmentsError } = await supabase
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
            .in("program_id", programIds);

        if (enrollmentsError) {
            throw enrollmentsError;
        }

        // Map enrollments to programs
        const programsWithEnrollment = programs.map(program => {
            const enrollment = enrollments?.find(e => e.program_id === program.id) || null;
            return {
                ...program,
                enrollment
            };
        });

        return {
            success: true,
            data: programsWithEnrollment
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get modules for a specific program
 */
export async function getProgramModules(programId: string): Promise<ActionResponse<Module[]>> {
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

        const supabase = await createClient();

        // First check if the patient is enrolled in this program
        const { data: enrollment, error: enrollmentError } = await supabase
            .from("patient_enrollments")
            .select("id")
            .eq("patient_id", authUser.id)
            .eq("program_id", programId)
            .not("status", "eq", "dropped")
            .maybeSingle();

        if (enrollmentError) {
            throw enrollmentError;
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
            .eq("program_id", programId)
            .order("sequence_number");

        if (error) {
            throw error;
        }

        // If patient is enrolled, get their progress for each module
        let modulesWithProgress = modules;

        if (enrollment) {
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
                .in("module_id", modules.map(m => m.id));

            if (progressError) {
                throw progressError;
            }

            // Map progress to modules
            modulesWithProgress = modules.map(module => {
                const moduleProgress = progress?.find(p => p.module_id === module.id) || null;
                return {
                    ...module,
                    progress: moduleProgress
                };
            });
        }

        return {
            success: true,
            data: modulesWithProgress
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Enroll patient in a program
 */
export async function enrollInProgram(programId: string): Promise<ActionResponse<PatientProgramEnrollment>> {
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

        const supabase = await createClient();

        // First check if patient already enrolled
        const { data: existingEnrollment, error: checkError } = await supabase
            .from("patient_enrollments")
            .select("*")
            .eq("patient_id", authUser.id)
            .eq("program_id", programId)
            .not("status", "eq", "dropped")
            .maybeSingle();

        if (checkError) {
            throw checkError;
        }

        // If already enrolled, return the existing enrollment
        if (existingEnrollment) {
            return {
                success: true,
                data: existingEnrollment as PatientProgramEnrollment
            };
        }

        // Get program details to check duration
        const { data: program, error: programError } = await supabase
            .from("treatment_programs")
            .select("duration_days")
            .eq("id", programId)
            .single();

        if (programError) {
            throw programError;
        }

        // Calculate expected end date if program has duration
        const startDate = new Date().toISOString().split('T')[0];
        let expectedEndDate = null;

        if (program.duration_days) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + program.duration_days);
            expectedEndDate = endDate.toISOString().split('T')[0];
        }

        // Create new enrollment
        const { data: enrollment, error: enrollError } = await supabase
            .from("patient_enrollments")
            .insert({
                patient_id: authUser.id,
                program_id: programId,
                start_date: startDate,
                expected_end_date: expectedEndDate,
                status: "in_progress"
            })
            .select()
            .single();

        if (enrollError) {
            throw enrollError;
        }

        // Initialize module progress for all modules in the program
        const { data: modules, error: modulesError } = await supabase
            .from("learning_modules")
            .select("id")
            .eq("program_id", programId);

        if (modulesError) {
            throw modulesError;
        }

        if (modules && modules.length > 0) {
            const moduleProgressData = modules.map(module => ({
                patient_id: authUser.id,
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

        return {
            success: true,
            data: enrollment as PatientProgramEnrollment
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get content items for a specific module
 */
export async function getModuleContent(moduleId: string): Promise<ActionResponse<[any]>> {
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

        const supabase = await createClient();

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
            .eq("module_id", moduleId)
            .order("sequence_number");

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
 * Update module progress status
 */
export async function updateModuleProgress(
    moduleId: string,
    status: 'in_progress' | 'completed'
): Promise<ActionResponse<ModuleProgress>> {
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

        const supabase = await createClient();

        // First get the module to find the program
        const { data: module, error: moduleError } = await supabase
            .from("learning_modules")
            .select("program_id")
            .eq("id", moduleId)
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
        const updateData: any = {
            status
        };

        // Set the appropriate timestamp based on status
        if (status === 'in_progress') {
            updateData.started_at = now;
        } else if (status === 'completed') {
            updateData.completed_at = now;
        }

        // Update or create the progress record
        const { data: progress, error: progressError } = await supabase
            .from("module_progress")
            .upsert({
                patient_id: authUser.id,
                module_id: moduleId,
                enrollment_id: enrollment.id,
                ...updateData
            })
            .select()
            .single();

        if (progressError) {
            throw progressError;
        }

        return {
            success: true,
            data: progress as ModuleProgress
        };
    } catch (error) {
        return handleServerError(error);
    }
}