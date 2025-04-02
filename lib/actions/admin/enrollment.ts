// lib/actions/admin/enrollment.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

// Program type definition to resolve the error
interface Program {
    id: string;
    title: string;
    description?: string;
    duration_days?: number;
}

// Enrollment details type
interface EnrollmentDetails {
    id: string;
    patient_id: string;
    program_id: string;
    program_title: string;
    start_date: string;
    expected_end_date?: string;
    status: string;
}

// Enrollment assignment schema
const EnrollmentSchema = z.object({
    patientId: z.string().uuid("Valid patient ID is required"),
    programId: z.string().uuid("Valid program ID is required"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
});

// Get patient's current enrollment
export async function getPatientCurrentEnrollment(patientId: string): Promise<ActionResponse<EnrollmentDetails | null>> {
    try {
        // Validate the patientId
        const validPatientId = z.string().uuid("Invalid patient ID").parse(patientId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get current active enrollment with program details
        const { data, error } = await supabase
            .from("patient_enrollments")
            .select(`
                id, 
                patient_id,
                program_id,
                start_date, 
                expected_end_date,
                status,
                program:treatment_programs(id, title)
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

        // Format the response
        return {
            success: true,
            data: {
                id: data.id,
                patient_id: data.patient_id,
                program_id: data.program?.id,
                program_title: data.program?.title || "Unknown Program", // Add fallback
                start_date: data.start_date,
                expected_end_date: data.expected_end_date,
                status: data.status
            }
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Assign patient to a program
export async function assignPatientToProgram(params: z.infer<typeof EnrollmentSchema>): Promise<ActionResponse<any>> {
    try {
        // Validate the data
        const validParams = EnrollmentSchema.parse(params);

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

        // Check if program exists
        const { data: program, error: programError } = await supabase
            .from("treatment_programs")
            .select("id, duration_days, title") // Added title to match the Program interface
            .eq("id", validParams.programId)
            .single();

        if (programError) {
            throw new Error("Program not found");
        }

        // Explicitly type program as Program
        const programData: Program = {
            id: program.id,
            title: program.title || "Unknown Program", // Add fallback
            duration_days: program.duration_days
        };

        // Calculate expected end date if program has a duration
        let expectedEndDate = null;
        if (programData.duration_days) {
            const startDate = new Date(validParams.startDate);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + programData.duration_days);
            expectedEndDate = endDate.toISOString().split('T')[0];
        }

        // Check if patient is already enrolled in any program
        const { data: existingEnrollment, error: enrollmentError } = await supabase
            .from("patient_enrollments")
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
                .from("patient_enrollments")
                .update({
                    status: "dropped",
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingEnrollment[0].id);

            if (updateError) {
                throw updateError;
            }

            // Clear existing progress data
            const { error: progressError } = await supabase
                .from("module_progress")
                .delete()
                .eq("patient_id", validParams.patientId);

            if (progressError) {
                throw progressError;
            }
        }

        // Create new enrollment
        const { data: enrollment, error: createError } = await supabase
            .from("patient_enrollments")
            .insert({
                patient_id: validParams.patientId,
                program_id: validParams.programId,
                enrolled_by: user.id,
                start_date: validParams.startDate,
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
            .eq("program_id", validParams.programId);

        if (modulesError) {
            throw modulesError;
        }

        if (modules && modules.length > 0) {
            const moduleProgressData = modules.map(module => ({
                patient_id: validParams.patientId,
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