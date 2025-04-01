// lib/actions/admin/assessment.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import { AssessmentSchema } from "@/lib/validations";

// Create a new assessment content item
export async function createAssessmentContent(
    params: z.infer<typeof AssessmentSchema>
): Promise<ActionResponse<{ contentItemId: string, assessmentId: string }>> {
    try {
        // Validate the data
        const validParams = AssessmentSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Start a transaction by creating the content item first
        const { data: contentItem, error: contentError } = await supabase
            .from("content_items")
            .insert({
                module_id: validParams.moduleId,
                title: validParams.title,
                content_type: 'assessment',
                content: JSON.stringify({
                    description: validParams.description,
                    instructions: validParams.instructions
                }),
                sequence_number: validParams.sequenceNumber,
                created_by: user.id
            })
            .select()
            .single();

        if (contentError) {
            throw contentError;
        }

        // Now create the assessment linked to the content item
        const { data: assessment, error: assessmentError } = await supabase
            .from("assessments")
            .insert({
                content_item_id: contentItem.id,
                title: validParams.title,
                description: validParams.description,
                passing_score: validParams.passingScore,
                time_limit_minutes: validParams.timeLimitMinutes || null,
                created_by: user.id
            })
            .select()
            .single();

        if (assessmentError) {
            // If there's an error, attempt to clean up the content item
            await supabase
                .from("content_items")
                .delete()
                .eq("id", contentItem.id);

            throw assessmentError;
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);

        return {
            success: true,
            data: {
                contentItemId: contentItem.id,
                assessmentId: assessment.id
            }
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Get an assessment by its ID with questions
export async function getAssessmentById(assessmentId: string): Promise<ActionResponse<any>> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(assessmentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the assessment with its content item and questions
        const { data, error } = await supabase
            .from("assessments")
            .select(`
                *,
                content_item:content_items(*),
                questions:assessment_questions(
                    *,
                    options:question_options(*)
                )
            `)
            .eq("id", validId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Assessment not found");
        }

        return {
            success: true,
            data
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Update an assessment
export async function updateAssessment(
    assessmentId: string,
    params: z.infer<typeof AssessmentSchema>
): Promise<ActionResponse<any>> {
    try {
        // Validate the data
        const validParams = AssessmentSchema.parse(params);
        const validId = z.string().uuid("Invalid ID format").parse(assessmentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // First, get the content item ID for this assessment
        const { data: assessment, error: getError } = await supabase
            .from("assessments")
            .select("content_item_id")
            .eq("id", validId)
            .single();

        if (getError || !assessment) {
            throw getError || new Error("Assessment not found");
        }

        // Update the content item
        const { error: contentError } = await supabase
            .from("content_items")
            .update({
                title: validParams.title,
                content: JSON.stringify({
                    description: validParams.description,
                    instructions: validParams.instructions
                }),
                sequence_number: validParams.sequenceNumber,
                updated_at: new Date().toISOString()
            })
            .eq("id", assessment.content_item_id);

        if (contentError) {
            throw contentError;
        }

        // Update the assessment
        const { data, error: assessmentError } = await supabase
            .from("assessments")
            .update({
                title: validParams.title,
                description: validParams.description,
                passing_score: validParams.passingScore,
                time_limit_minutes: validParams.timeLimitMinutes || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", validId)
            .select()
            .single();

        if (assessmentError) {
            throw assessmentError;
        }

        // Refresh the paths
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);
        revalidatePath(`/admin/programs/*/modules/*/content/assessment/${validId}`);

        return {
            success: true,
            data
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Delete an assessment
export async function deleteAssessment(
    assessmentId: string,
    contentItemId: string,
    moduleId: string
): Promise<ActionResponse<null>> {
    try {
        // Validate the IDs
        const validAssessmentId = z.string().uuid().parse(assessmentId);
        const validContentItemId = z.string().uuid().parse(contentItemId);
        const validModuleId = z.string().uuid().parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Delete the assessment first (this will cascade to questions and options)
        const { error: assessmentError } = await supabase
            .from("assessments")
            .delete()
            .eq("id", validAssessmentId);

        if (assessmentError) {
            throw assessmentError;
        }

        // Delete the content item
        const { error: contentError } = await supabase
            .from("content_items")
            .delete()
            .eq("id", validContentItemId);

        if (contentError) {
            throw contentError;
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validModuleId}`);

        return {
            success: true,
            data: null
        };
    } catch (error) {
        return handleServerError(error);
    }
}