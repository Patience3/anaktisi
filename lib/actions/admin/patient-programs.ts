// lib/actions/admin/patient-programs.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

// PatientProgram interface for response
interface PatientProgram {
    id: string;
    title: string;
    description: string | null;
    duration_days: number | null;
    is_self_paced: boolean;
    status: 'assigned' | 'in_progress' | 'completed' | 'dropped';
    start_date: string;
    expected_end_date: string | null;
    completed_date: string | null;
    enrollment_id: string;
}

// Define interfaces for joined table responses
interface ProgramEnrollment {
    id: string;
    patient_id: string;
    program_id: string;
    start_date: string;
    expected_end_date: string | null;
    completed_date: string | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'dropped';
    treatment_programs: {
        id: string;
        title: string;
        description: string | null;
        duration_days: number | null;
        is_self_paced: boolean;
    };
}

// Interface for category enrollments
interface CategoryEnrollment {
    id: string;
    patient_id: string;
    category_id: string;
    assigned_at: string;
    program_categories: {
        id: string;
        name: string;
        description: string | null;
    };
}

// Interface for category details
interface PatientCategoryDetail {
    id: string | null;
    patientId: string;
    categoryId: string;
    categoryName: string | null;
}

// Get programs enrolled by a patient
export async function getPatientEnrolledPrograms(patientId: string): Promise<ActionResponse<PatientProgram[]>> {
    try {
        // Validate patientId
        const validPatientId = z.string().uuid("Invalid patient ID").parse(patientId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Check if patient exists
        const { data: patientData, error: patientError } = await supabase
            .from("users")
            .select("id")
            .eq("id", validPatientId)
            .eq("role", "patient")
            .single();

        if (patientError) {
            throw new Error("Patient not found");
        }

        // Get patient's enrollments with program details
        const { data, error } = await supabase
            .from("patient_enrollments")
            .select(`
        id,
        patient_id,
        program_id,
        start_date,
        expected_end_date,
        completed_date,
        status,
        treatment_programs (
          id,
          title,
          description,
          duration_days,
          is_self_paced
        )
      `)
            .eq("patient_id", validPatientId)
            .not("status", "eq", "dropped")
            .order("start_date", { ascending: false });

        if (error) {
            throw error;
        }

        // Cast the data to the correct type
        const enrollments = data as unknown as ProgramEnrollment[];

        // Transform data to match our interface
        const patientPrograms: PatientProgram[] = enrollments.map(enrollment => ({
            id: enrollment.treatment_programs?.id || "",
            title: enrollment.treatment_programs?.title || "Unknown Program",
            description: enrollment.treatment_programs?.description,
            duration_days: enrollment.treatment_programs?.duration_days,
            is_self_paced: enrollment.treatment_programs?.is_self_paced || false,
            status: enrollment.status,
            start_date: enrollment.start_date,
            expected_end_date: enrollment.expected_end_date,
            completed_date: enrollment.completed_date,
            enrollment_id: enrollment.id
        }));

        return {
            success: true,
            data: patientPrograms
        };
    } catch (error) {
        console.error("Error in getPatientEnrolledPrograms:", error);
        return handleServerError(error);
    }
}

// Get patient's category enrollment
export async function getPatientCategory(patientId: string): Promise<ActionResponse<PatientCategoryDetail | null>> {
    try {
        // Validate patientId
        const validPatientId = z.string().uuid("Invalid patient ID").parse(patientId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get patient's category assignment
        const { data, error } = await supabase
            .from("patient_categories")
            .select(`
        id,
        patient_id,
        category_id,
        program_categories (
          id,
          name,
          description
        )
      `)
            .eq("patient_id", validPatientId)
            .single();

        if (error) {
            // If no category found, return null data with success (not an error)
            if (error.code === 'PGRST116') {
                return {
                    success: true,
                    data: null
                };
            }
            throw error;
        }

        // Format the response
        return {
            success: true,
            data: {
                id: data.id,
                patientId: data.patient_id,
                categoryId: data.category_id,
                // @ts-ignore
                categoryName: data.program_categories?.name || null
            }
        };
    } catch (error) {
        console.error("Error in getPatientCategory:", error);
        return handleServerError(error);
    }
}

// Enroll a patient in multiple programs at once
export async function enrollPatientInPrograms(
    patientId: string,
    programIds: string[]
): Promise<ActionResponse<{ enrollmentsCreated: number }>> {
    try {
        // Validate patientId
        const validPatientId = z.string().uuid("Invalid patient ID").parse(patientId);

        // Validate program IDs
        if (!Array.isArray(programIds) || programIds.length === 0) {
            return {
                success: false,
                error: { message: "No programs selected for enrollment" },
                status: 400
            };
        }

        // Validate each program ID
        const programIdsSchema = z.array(z.string().uuid("Invalid program ID format"));
        const validProgramIds = programIdsSchema.parse(programIds);

        // Ensure the user is an admin
        await requireAdmin();

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

        // Get today's date in ISO format
        const today = new Date().toISOString().split('T')[0];

        // Create enrollment records
        const enrollments = validProgramIds.map(programId => ({
            patient_id: validPatientId,
            program_id: programId,
            start_date: today,
            status: 'assigned' as const
        }));

        // Insert enrollments
        const { data, error } = await supabase
            .from("patient_enrollments")
            .insert(enrollments)
            .select();

        if (error) {
            throw error;
        }

        // Return success with count of enrollments created
        return {
            success: true,
            data: {
                enrollmentsCreated: data?.length || 0
            }
        };
    } catch (error) {
        console.error("Error in enrollPatientInPrograms:", error);
        return handleServerError(error);
    }
}

// Update enrollment status
export async function updateEnrollmentStatus(
    enrollmentId: string,
    status: 'assigned' | 'in_progress' | 'completed' | 'dropped'
): Promise<ActionResponse<{ updated: boolean }>> {
    try {
        // Validate enrollmentId
        const validEnrollmentId = z.string().uuid("Invalid enrollment ID").parse(enrollmentId);

        // Validate status
        const statusSchema = z.enum(['assigned', 'in_progress', 'completed', 'dropped']);
        const validStatus = statusSchema.parse(status);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update fields based on status
        const updateData: Record<string, unknown> = {
            status: validStatus,
            updated_at: new Date().toISOString()
        };

        // If status is 'completed', set the completed_date
        if (validStatus === 'completed') {
            updateData.completed_date = new Date().toISOString().split('T')[0];
        }

        // Update the enrollment
        const { error } = await supabase
            .from("patient_enrollments")
            .update(updateData)
            .eq("id", validEnrollmentId);

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: { updated: true }
        };
    } catch (error) {
        console.error("Error in updateEnrollmentStatus:", error);
        return handleServerError(error);
    }
}