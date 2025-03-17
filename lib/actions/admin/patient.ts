// lib/actions/admin/patient.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { Patient } from "@/components/admin/patient-columns";

/**
 * Retrieve all patients from the database
 */
export async function getAllPatients(): Promise<ActionResponse<Patient[]>> {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get patients with pagination, sorting, and filtering in the future
        const { data, error } = await supabase
            .from("users")
            .select("id, email, first_name, last_name, is_active, created_at")
            .eq("role", "patient")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data as Patient[]
        };
    } catch (error) {
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
            .select("id, email, first_name, last_name, is_active, created_at, date_of_birth, gender, phone")
            .eq("id", id)
            .eq("role", "patient")
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Patient not found");
        }

        return {
            success: true,
            data: data as unknown as Patient
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update patient active status
 */
export async function updatePatientStatus(id: string, isActive: boolean): Promise<ActionResponse> {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        const { error } = await supabase
            .from("users")
            .update({ is_active: isActive })
            .eq("id", id)
            .eq("role", "patient");

        if (error) {
            throw error;
        }

        // Revalidate the patients page to refresh the data
        revalidatePath("/admin/patients");

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}