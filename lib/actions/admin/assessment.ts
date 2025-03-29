// lib/actions/admin/assessment.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import {
    CreateAssessmentSchema,
    CreateQuestionSchema,
    CreateQuestionOptionSchema,
    Assessment,
    AssessmentQuestion,
    QuestionOption
} from "@/lib/validations";

/**
 * Get all assessments for a module
 */
export async function getModuleAssessments(moduleId: string): Promise<ActionResponse<Assessment[]>> {
    try {
        // Validate the moduleId
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get assessments with creator information and question count
        const { data, error } = await supabase
            .from("assessments")
            .select(`
                *,
                created_by:users(first_name, last_name),
                questions:assessment_questions(count)
            `)
            .eq("module_id", validModuleId)
            .order("sequence_number", { ascending: true });

        if (error) {
            throw error;
        }

        // Transform the data to include joined fields and counts
        const assessments = data.map(assessment => ({
            ...assessment,
            created_by_name: assessment.created_by ?
                `${assessment.created_by.first_name} ${assessment.created_by.last_name}` :
                undefined,
            total_questions: assessment.questions?.length || 0
        }));

        return {
            success: true,
            data: assessments as Assessment[]
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get a single assessment by ID
 */
export async function getAssessmentById(assessmentId: string): Promise<ActionResponse<Assessment>> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(assessmentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get assessment with creator information and question count
        const { data, error } = await supabase
            .from("assessments")
            .select(`
                *,
                created_by:users(first_name, last_name),
                questions:assessment_questions(count)
            `)
            .eq("id", validId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Assessment not found");
        }

        // Transform the data for the frontend
        const assessment = {
            ...data,
            created_by_name: data.created_by ?
                `${data.created_by.first_name} ${data.created_by.last_name}` :
                undefined,
            total_questions: data.questions?.length || 0
        };

        return {
            success: true,
            data: assessment as Assessment
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get the next available sequence number for assessments in a module
 */
export async function getNextAssessmentSequence(moduleId: string): Promise<ActionResponse<number>> {
    try {
        // Validate the moduleId
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the highest sequence number currently in use
        const { data, error } = await supabase
            .from("assessments")
            .select("sequence_number")
            .eq("module_id", validModuleId)
            .order("sequence_number", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        // If there are no assessments yet, start at 1
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
 * Create a new assessment
 */
export async function createAssessment(params: z.infer<typeof CreateAssessmentSchema>): Promise<ActionResponse<Assessment>> {
    try {
        // Validate the data
        const validParams = CreateAssessmentSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Create the new assessment
        const { data, error } = await supabase
            .from("assessments")
            .insert({
                module_id: validParams.moduleId,
                title: validParams.title,
                description: validParams.description || null,
                passing_score: validParams.passingScore,
                time_limit_minutes: validParams.timeLimitMinutes || null,
                sequence_number: validParams.sequenceNumber,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the assessments list
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);

        return {
            success: true,
            data: data as Assessment
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update an existing assessment
 */
export async function updateAssessment(assessmentId: string, params: z.infer<typeof CreateAssessmentSchema>): Promise<ActionResponse<Assessment>> {
    try {
        // Validate the id and data
        const validId = z.string().uuid("Invalid ID format").parse(assessmentId);
        const validParams = CreateAssessmentSchema.parse(params);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update the assessment
        const { data, error } = await supabase
            .from("assessments")
            .update({
                title: validParams.title,
                description: validParams.description || null,
                passing_score: validParams.passingScore,
                time_limit_minutes: validParams.timeLimitMinutes || null,
                sequence_number: validParams.sequenceNumber,
                updated_at: new Date().toISOString()
            })
            .eq("id", validId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the paths
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);
        revalidatePath(`/admin/programs/*/modules/*/assessments/${validId}`);

        return {
            success: true,
            data: data as Assessment
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(assessmentId: string, moduleId: string): Promise<ActionResponse> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(assessmentId);
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Delete the assessment (cascades to questions and options)
        const { error } = await supabase
            .from("assessments")
            .delete()
            .eq("id", validId);

        if (error) {
            throw error;
        }

        // Refresh the assessments list
        revalidatePath(`/admin/programs/*/modules/${moduleId}`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get all questions for an assessment
 */
export async function getAssessmentQuestions(assessmentId: string): Promise<ActionResponse<AssessmentQuestion[]>> {
    try {
        // Validate the assessmentId
        const validId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get questions with their options
        const { data, error } = await supabase
            .from("assessment_questions")
            .select(`
                *,
                options:question_options(*)
            `)
            .eq("assessment_id", validId)
            .order("sequence_number", { ascending: true });

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data as AssessmentQuestion[]
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get a single question by ID with its options
 */
export async function getQuestionById(questionId: string): Promise<ActionResponse<AssessmentQuestion>> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(questionId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get question with its options
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
            data: data as AssessmentQuestion
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get the next available sequence number for questions in an assessment
 */
export async function getNextQuestionSequence(assessmentId: string): Promise<ActionResponse<number>> {
    try {
        // Validate the assessmentId
        const validId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the highest sequence number currently in use
        const { data, error } = await supabase
            .from("assessment_questions")
            .select("sequence_number")
            .eq("assessment_id", validId)
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

/**
 * Create a new question
 */
export async function createQuestion(params: z.infer<typeof CreateQuestionSchema>): Promise<ActionResponse<AssessmentQuestion>> {
    try {
        // Validate the data
        const validParams = CreateQuestionSchema.parse(params);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Create the new question
        const { data, error } = await supabase
            .from("assessment_questions")
            .insert({
                assessment_id: validParams.assessmentId,
                question_text: validParams.questionText,
                question_type: validParams.questionType,
                sequence_number: validParams.sequenceNumber,
                points: validParams.points
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the questions list
        revalidatePath(`/admin/programs/*/modules/*/assessments/${validParams.assessmentId}`);

        return {
            success: true,
            data: data as AssessmentQuestion
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update an existing question
 */
export async function updateQuestion(questionId: string, params: z.infer<typeof CreateQuestionSchema>): Promise<ActionResponse<AssessmentQuestion>> {
    try {
        // Validate the id and data
        const validId = z.string().uuid("Invalid ID format").parse(questionId);
        const validParams = CreateQuestionSchema.parse(params);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update the question
        const { data, error } = await supabase
            .from("assessment_questions")
            .update({
                question_text: validParams.questionText,
                question_type: validParams.questionType,
                sequence_number: validParams.sequenceNumber,
                points: validParams.points,
                updated_at: new Date().toISOString()
            })
            .eq("id", validId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the paths
        revalidatePath(`/admin/programs/*/modules/*/assessments/${validParams.assessmentId}`);

        return {
            success: true,
            data: data as AssessmentQuestion
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId: string, assessmentId: string): Promise<ActionResponse> {
    try {
        // Validate the ids
        const validId = z.string().uuid("Invalid ID format").parse(questionId);
        const validAssessmentId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Delete the question (cascades to options)
        const { error } = await supabase
            .from("assessment_questions")
            .delete()
            .eq("id", validId);

        if (error) {
            throw error;
        }

        // Refresh the questions list
        revalidatePath(`/admin/programs/*/modules/*/assessments/${validAssessmentId}`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new question option
 */
export async function createQuestionOption(params: z.infer<typeof CreateQuestionOptionSchema>): Promise<ActionResponse<QuestionOption>> {
    try {
        // Validate the data
        const validParams = CreateQuestionOptionSchema.parse(params);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Create the new option
        const { data, error } = await supabase
            .from("question_options")
            .insert({
                question_id: validParams.questionId,
                option_text: validParams.optionText,
                is_correct: validParams.isCorrect,
                sequence_number: validParams.sequenceNumber
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the options list
        revalidatePath(`/admin/programs/*/modules/*/assessments/*/questions/${validParams.questionId}`);

        return {
            success: true,
            data: data as QuestionOption
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update an existing question option
 */
export async function updateQuestionOption(optionId: string, params: z.infer<typeof CreateQuestionOptionSchema>): Promise<ActionResponse<QuestionOption>> {
    try {
        // Validate the id and data
        const validId = z.string().uuid("Invalid ID format").parse(optionId);
        const validParams = CreateQuestionOptionSchema.parse(params);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Update the option
        const { data, error } = await supabase
            .from("question_options")
            .update({
                option_text: validParams.optionText,
                is_correct: validParams.isCorrect,
                sequence_number: validParams.sequenceNumber,
                updated_at: new Date().toISOString()
            })
            .eq("id", validId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the paths
        revalidatePath(`/admin/programs/*/modules/*/assessments/*/questions/${validParams.questionId}`);

        return {
            success: true,
            data: data as QuestionOption
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Delete a question option
 */
export async function deleteQuestionOption(optionId: string, questionId: string): Promise<ActionResponse> {
    try {
        // Validate the ids
        const validId = z.string().uuid("Invalid ID format").parse(optionId);
        const validQuestionId = z.string().uuid("Invalid question ID").parse(questionId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Delete the option
        const { error } = await supabase
            .from("question_options")
            .delete()
            .eq("id", validId);

        if (error) {
            throw error;
        }

        // Refresh the options list
        revalidatePath(`/admin/programs/*/modules/*/assessments/*/questions/${validQuestionId}`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}