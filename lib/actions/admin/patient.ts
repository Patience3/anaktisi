// lib/actions/admin/patient.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

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

// Category assignment validation schema
const AssignCategorySchema = z.object({
    patientId: z.string().uuid("Invalid patient ID"),
    categoryId: z.string().uuid("Invalid category ID")
});

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

        // Build the query
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
                role,
                patient_categories(
                    id, 
                    category_id, 
                    program_categories(id, name)
                )
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
            throw error;
        }

        // Transform data to include category information
        const patients: Patient[] = data.map(patient => {
            // Get the active category if any
            const activeCategory = patient.patient_categories && patient.patient_categories.length > 0
                ? patient.patient_categories[0] // Take the first category assignment
                : null;

            // Create the patient object with category info if available
            const patientWithCategory: Patient = {
                ...patient,
                category: activeCategory && activeCategory.program_categories
                    ? {
                        id: activeCategory.category_id,
                        name: activeCategory.program_categories.name || "Unknown Category"
                    }
                    : null
            };

            // Filter by category if needed
            if (categoryId && (!patientWithCategory.category || patientWithCategory.category.id !== categoryId)) {
                return null; // Will be filtered out below
            }

            return patientWithCategory;
        }).filter(Boolean) as Patient[]; // Remove null entries (filtered out patients)

        return {
            success: true,
            data: patients
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

        // Get the active category if any
        const activeCategory = data.patient_categories && data.patient_categories.length > 0
            ? data.patient_categories[0] // Take the first category assignment
            : null;

        // Create the patient object with category info if available
        const patient: Patient = {
            ...data,
            category: activeCategory && activeCategory.program_categories
                ? {
                    id: activeCategory.category_id,
                    name: activeCategory.program_categories.name || "Unknown Category"
                }
                : null
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
): Promise<ActionResponse> {
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
 * Assign a patient to a treatment category
 */
export async function assignPatientToCategory(
    patientId: string,
    categoryId: string
): Promise<ActionResponse> {
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
            data: data
        };
    } catch (error) {
        return handleServerError(error);
    }
}