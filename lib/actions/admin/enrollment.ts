"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

// Define proper type for the Program interface
export interface Program {
    id: string;
    title: string;
    description: string | null;
    duration_days: number | null;
    is_self_paced: boolean;
    is_active: boolean;
    created_at: string;
    category_id: string;
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
            .select("id, title, description, duration_days, is_self_paced, is_active, created_at, category_id")
            .eq("category_id", validCategoryId)
            .eq("is_active", true)
            .order("title");

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data as Program[] || []
        };
    } catch (error) {
        console.error("Error in getProgramsByCategory:", error);
        return handleServerError(error);
    }
}

// Enroll patient in multiple programs
export async function enrollPatientInPrograms(
    patientId: string,
    programIds: string[],
    categoryId: string,
    categoryEnrollmentId?: string
): Promise<ActionResponse<any>> {
    try {
        // Validate input
        if (!patientId || !Array.isArray(programIds) || programIds.length === 0 || !categoryId) {
            return {
                success: false,
                error: {
                    message: "Invalid input. Patient ID, category ID, and at least one program ID are required."
                },
                status: 400
            };
        }

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // First, check if the patient exists
        const { data: patient, error: patientError } = await supabase
            .from("users")
            .select("id")
            .eq("id", patientId)
            .eq("role", "patient")
            .single();

        if (patientError) {
            throw new Error("Patient not found");
        }

        // Check if programs belong to the category
        const { data: programs, error: programsError } = await supabase
            .from("treatment_programs")
            .select("id, title, duration_days, category_id")
            .in("id", programIds)
            .eq("category_id", categoryId)
            .eq("is_active", true);

        if (programsError) {
            throw programsError;
        }

        if (!programs || programs.length === 0) {
            throw new Error("No valid programs found in the specified category");
        }

        // Check if category enrollment exists, create if not
        let enrollmentId = categoryEnrollmentId;

        if (!enrollmentId) {
            // Check if patient already has a category enrollment
            const { data: existingEnrollment, error: enrollmentError } = await supabase
                .from("patient_categories")
                .select("id")
                .eq("patient_id", patientId)
                .eq("category_id", categoryId)
                .maybeSingle();

            if (enrollmentError && enrollmentError.code !== 'PGRST116') {
                throw enrollmentError;
            }

            if (existingEnrollment) {
                enrollmentId = existingEnrollment.id;
            } else {
                // Create category enrollment
                const { data: newEnrollment, error: newEnrollmentError } = await supabase
                    .from("patient_categories")
                    .insert({
                        patient_id: patientId,
                        category_id: categoryId,
                        assigned_by: user.id,
                        assigned_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (newEnrollmentError) {
                    throw newEnrollmentError;
                }

                enrollmentId = newEnrollment.id;
            }
        }

        // Create enrollments for each program
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const enrollmentData = programs.map(program => {
            // Calculate expected end date if program has duration
            let expectedEndDate = null;
            if (program.duration_days) {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + program.duration_days);
                expectedEndDate = endDate.toISOString().split('T')[0];
            }

            return {
                patient_id: patientId,
                program_id: program.id,
                category_enrollment_id: enrollmentId,
                enrolled_by: user.id,
                start_date: today,
                expected_end_date: expectedEndDate,
                status: "in_progress"
            };
        });

        // Insert program enrollments
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from("patient_enrollments")
            .insert(enrollmentData)
            .select();

        if (enrollmentsError) {
            throw enrollmentsError;
        }

        // Initialize module progress for each program and module
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
                const enrollment = enrollments.find(e => e.program_id === program.id);

                if (enrollment) {
                    const moduleProgressData = modules.map(module => ({
                        patient_id: patientId,
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

        // Revalidate relevant paths
        revalidatePath(`/admin/patients/${patientId}`);
        revalidatePath('/admin/patients');
        revalidatePath('/patient');
        revalidatePath('/patient/programs');

        return {
            success: true,
            data: {
                enrollments: enrollments,
                enrolledPrograms: programs.length
            }
        };
    } catch (error) {
        console.error("Error in enrollPatientInPrograms:", error);
        return handleServerError(error);
    }
}