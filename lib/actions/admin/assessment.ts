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

// Additional functions to add to lib/actions/admin/assessment.ts

// Get the next available sequence number for questions in an assessment
export async function getNextQuestionSequence(assessmentId: string): Promise<ActionResponse<number>> {
    try {
        // Validate the assessmentId
        const validAssessmentId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the highest sequence number currently in use
        const { data, error } = await supabase
            .from("assessment_questions")
            .select("sequence_number")
            .eq("assessment_id", validAssessmentId)
            .order("sequence_number", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        // If there are no questions yet, start at 1
        const nextSequence = data.length > 0 ? data[0].sequence_number + 1 : 1;

        return {
            success: true,
            data: nextSequence
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Create a new question
export async function createQuestion(params: QuestionWithOptions): Promise<ActionResponse<any>> {
    try {
        // Validate the data
        // Using a custom interface instead of the zod schema directly
        const { assessmentId, questionText, questionType, sequenceNumber, points, options } = params;

        // Basic validation
        if (!assessmentId || !questionText || !questionType || !sequenceNumber || !points) {
            throw new Error("Missing required question fields");
        }

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Create the question
        const { data: question, error: questionError } = await supabase
            .from("assessment_questions")
            .insert({
                assessment_id: assessmentId,
                question_text: questionText,
                question_type: questionType,
                sequence_number: sequenceNumber,
                points
            })
            .select()
            .single();

        if (questionError) {
            throw questionError;
        }

        // For multiple choice or true/false questions, create the options
        if ((questionType === 'multiple_choice' || questionType === 'true_false') && options && options.length > 0) {
            const formattedOptions = options.map(option => ({
                question_id: question.id,
                option_text: option.optionText,
                is_correct: option.isCorrect,
                sequence_number: option.sequenceNumber
            }));

            const { error: optionsError } = await supabase
                .from("question_options")
                .insert(formattedOptions);

            if (optionsError) {
                // If there's an error with options, attempt to clean up the question
                await supabase
                    .from("assessment_questions")
                    .delete()
                    .eq("id", question.id);

                throw optionsError;
            }
        }

        // Refresh the assessment page
        revalidatePath(`/admin/programs/*/modules/*/content/assessment/${assessmentId}`);

        return {
            success: true,
            data: question
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Update an existing question
export async function updateQuestion(questionId: string, params: QuestionWithOptions): Promise<ActionResponse<any>> {
    try {
        // Validate the data and ID
        const validId = z.string().uuid("Invalid ID format").parse(questionId);
        const { assessmentId, questionText, questionType, sequenceNumber, points, options } = params;

        // Basic validation
        if (!assessmentId || !questionText || !questionType || !sequenceNumber || !points) {
            throw new Error("Missing required question fields");
        }

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update the question
        const { data: question, error: questionError } = await supabase
            .from("assessment_questions")
            .update({
                question_text: questionText,
                question_type: questionType,
                sequence_number: sequenceNumber,
                points,
                updated_at: new Date().toISOString()
            })
            .eq("id", validId)
            .select()
            .single();

        if (questionError) {
            throw questionError;
        }

        // For multiple choice or true/false questions, update the options
        if (questionType === 'multiple_choice' || questionType === 'true_false') {
            if (options && options.length > 0) {
                // First, delete all existing options for this question
                const { error: deleteError } = await supabase
                    .from("question_options")
                    .delete()
                    .eq("question_id", validId);

                if (deleteError) {
                    throw deleteError;
                }

                // Then, insert the new/updated options
                const formattedOptions = options.map(option => ({
                    question_id: validId,
                    option_text: option.optionText,
                    is_correct: option.isCorrect,
                    sequence_number: option.sequenceNumber
                }));

                const { error: insertError } = await supabase
                    .from("question_options")
                    .insert(formattedOptions);

                if (insertError) {
                    throw insertError;
                }
            }
        }

        // Refresh the assessment page
        revalidatePath(`/admin/programs/*/modules/*/content/assessment/${assessmentId}`);

        return {
            success: true,
            data: question
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Define the interface for the question with options
interface QuestionWithOptions {
    assessmentId: string;
    questionText: string;
    questionType: 'multiple_choice' | 'true_false' | 'text_response';
    sequenceNumber: number;
    points: number;
    options?: {
        id?: string;
        optionText: string;
        isCorrect: boolean;
        sequenceNumber: number;
    }[];
}
// Add to lib/actions/admin/assessment.ts

// Get the next available sequence number for content items in a module
export async function getNextContentSequence(moduleId: string): Promise<ActionResponse<number>> {
    try {
        // Validate the moduleId
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the highest sequence number currently in use
        const { data, error } = await supabase
            .from("content_items")
            .select("sequence_number")
            .eq("module_id", validModuleId)
            .order("sequence_number", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        // If there are no content items yet, start at 1
        const nextSequence = data.length > 0 ? data[0].sequence_number + 1 : 1;

        return {
            success: true,
            data: nextSequence
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Add to lib/actions/admin/assessment.ts

// Get a question by ID with its options
export async function getQuestionById(questionId: string): Promise<ActionResponse<any>> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(questionId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the question with its options
        const { data, error } = await supabase
            .from("assessment_questions")
            .select(`
                *,
                options:question_options(*)
            `)
            .eq("id", validId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Question not found");
        }

        return {
            success: true,
            data
        };
    } catch (error) {
        return handleServerError(error);
    }
}

// Delete a question
export async function deleteQuestion(questionId: string): Promise<ActionResponse<null>> {
    try {
        // Validate the ID
        const validId = z.string().uuid("Invalid ID format").parse(questionId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Delete the question (this will cascade to options)
        const { error } = await supabase
            .from("assessment_questions")
            .delete()
            .eq("id", validId);

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: null
        };
    } catch (error) {
        return handleServerError(error);
    }
}