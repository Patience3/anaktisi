// lib/actions/patient/assessments.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { getAuthUserSafe } from "@/lib/auth-utils";
import { z } from "zod";

interface AssessmentAnswer {
    questionId: string;
    questionType: 'multiple_choice' | 'true_false' | 'text_response';
    selectedOptionId?: string;
    textResponse?: string;
}

export async function submitAssessment(
    assessmentId: string,
    answers: AssessmentAnswer[]
): Promise<ActionResponse<any>> {
    try {
        const authUser = await getAuthUserSafe();
        if (!authUser) return {
            success: false,
            error: { message: "Not authenticated" },
            status: 401
        };

        const supabase = await createClient();

        // Create attempt record
        const { data: attempt, error } = await supabase
            .from("patient_assessment_attempts")
            .insert({
                patient_id: authUser.id,
                assessment_id: assessmentId,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Process each answer
        for (const answer of answers) {
            if (answer.questionType === 'multiple_choice' || answer.questionType === 'true_false') {
                // Get question points
                const { data: question } = await supabase
                    .from("assessment_questions")
                    .select("points")
                    .eq("id", answer.questionId)
                    .single();

                // Get correct option
                const { data: correctOption } = await supabase
                    .from("question_options")
                    .select("id")
                    .eq("question_id", answer.questionId)
                    .eq("is_correct", true)
                    .single();

                // Check if answer is correct
                const isCorrect = answer.selectedOptionId === correctOption?.id;

                // Insert response
                await supabase
                    .from("patient_question_responses")
                    .insert({
                        attempt_id: attempt.id,
                        question_id: answer.questionId,
                        selected_option_id: answer.selectedOptionId,
                        is_correct: isCorrect,
                        points_earned: isCorrect ? question.points : 0
                    });
            } else if (answer.questionType === 'text_response') {
                // Text responses need manual review
                await supabase
                    .from("patient_question_responses")
                    .insert({
                        attempt_id: attempt.id,
                        question_id: answer.questionId,
                        text_response: answer.textResponse,
                        is_correct: null,
                        points_earned: 0
                    });
            }
        }

        // Calculate score
        const { data: responses } = await supabase
            .from("patient_question_responses")
            .select("points_earned")
            .eq("attempt_id", attempt.id)
            .not("is_correct", "is", null);

        const { data: assessment } = await supabase
            .from("assessments")
            .select("passing_score")
            .eq("id", assessmentId)
            .single();

        const { data: questions } = await supabase
            .from("assessment_questions")
            .select("id, points")
            .eq("assessment_id", assessmentId);

        // Calculate score as percentage
        const totalPossiblePoints = questions.reduce((sum, q) => sum + q.points, 0);
        const earnedPoints = responses.reduce((sum, r) => sum + r.points_earned, 0);
        const scorePercentage = Math.round((earnedPoints / totalPossiblePoints) * 100);

        // Update attempt with score
        const { data: updatedAttempt } = await supabase
            .from("patient_assessment_attempts")
            .update({
                completed_at: new Date().toISOString(),
                score: scorePercentage,
                passed: scorePercentage >= assessment.passing_score
            })
            .eq("id", attempt.id)
            .select()
            .single();

        return { success: true, data: updatedAttempt };
    } catch (error) {
        return handleServerError(error);
    }
}

export async function getAssessment(assessmentId: string): Promise<ActionResponse<any>> {
    try {
        const authUser = await getAuthUserSafe();
        if (!authUser) return {
            success: false,
            error: { message: "Not authenticated" },
            status: 401
        };

        const supabase = await createClient();

        // Get assessment with questions
        const { data, error } = await supabase
            .from("assessments")
            .select(`
        id, content_item_id, title, description, passing_score, time_limit_minutes,
        questions:assessment_questions(
          id, question_text, question_type, sequence_number, points,
          options:question_options(id, option_text, is_correct, sequence_number)
        )
      `)
            .eq("id", assessmentId)
            .single();

        if (error) throw error;

        // Sort questions and options by sequence
        if (data.questions) {
            data.questions.sort((a, b) => a.sequence_number - b.sequence_number);

            data.questions.forEach(question => {
                if (question.options) {
                    question.options.sort((a, b) => a.sequence_number - b.sequence_number);
                }
            });
        }

        return { success: true, data };
    } catch (error) {
        return handleServerError(error);
    }
}