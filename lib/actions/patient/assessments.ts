// lib/actions/patient/assessments.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * Get all assessments for a patient's category
 */
export async function getPatientAssessments(categoryId: string) {
    try {
        // Validate the categoryId
        const validCategoryId = z.string().uuid("Invalid category ID").parse(categoryId);

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

        // Get all active programs in the patient's category
        const { data: programs, error: programsError } = await supabase
            .from("treatment_programs")
            .select("id")
            .eq("category_id", validCategoryId)
            .eq("is_active", true);

        if (programsError) {
            throw programsError;
        }

        if (!programs || programs.length === 0) {
            return {
                success: true,
                data: {
                    available: [],
                    completed: []
                }
            };
        }

        // Get all modules for these programs
        const programIds = programs.map(p => p.id);
        const { data: modules, error: modulesError } = await supabase
            .from("learning_modules")
            .select("id, title, program_id")
            .in("program_id", programIds);

        if (modulesError) {
            throw modulesError;
        }

        if (!modules || modules.length === 0) {
            return {
                success: true,
                data: {
                    available: [],
                    completed: []
                }
            };
        }

        // Get all content items of type 'assessment' in these modules
        const moduleIds = modules.map(m => m.id);
        const { data: contentItems, error: contentError } = await supabase
            .from("content_items")
            .select(`
        id, 
        title,
        module_id,
        content_type,
        sequence_number,
        learning_modules(
          title, 
          program_id,
          treatment_programs(title)
        )
      `)
            .in("module_id", moduleIds)
            .eq("content_type", "assessment");

        if (contentError) {
            throw contentError;
        }

        if (!contentItems || contentItems.length === 0) {
            return {
                success: true,
                data: {
                    available: [],
                    completed: []
                }
            };
        }

        // Get assessment details for these content items
        const contentItemIds = contentItems.map(item => item.id);
        const { data: assessments, error: assessmentsError } = await supabase
            .from("assessments")
            .select(`
        id, 
        content_item_id,
        title,
        description,
        passing_score,
        time_limit_minutes
      `)
            .in("content_item_id", contentItemIds);

        if (assessmentsError) {
            throw assessmentsError;
        }

        // Get the patient's assessment attempts
        const { data: attempts, error: attemptsError } = await supabase
            .from("patient_assessment_attempts")
            .select(`
        id,
        assessment_id,
        started_at,
        completed_at,
        score,
        passed
      `)
            .eq("patient_id", authUser.id);

        if (attemptsError) {
            throw attemptsError;
        }

        // Map assessments with content and module information
        const mappedAssessments = assessments.map(assessment => {
            const contentItem = contentItems.find(item => item.id === assessment.content_item_id);
            const module = contentItem?.learning_modules;
            const program = module?.treatment_programs;

            // Find patient's attempts for this assessment
            const assessmentAttempts = attempts?.filter(a => a.assessment_id === assessment.id) || [];

            // Get the latest attempt
            const latestAttempt = assessmentAttempts.length > 0
                ? assessmentAttempts.sort((a, b) =>
                    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
                )[0]
                : null;

            return {
                id: assessment.id,
                title: assessment.title,
                description: assessment.description,
                passingScore: assessment.passing_score,
                timeLimit: assessment.time_limit_minutes,
                contentItemId: assessment.content_item_id,
                moduleId: contentItem?.module_id,
                moduleName: module?.title,
                programId: module?.program_id,
                programName: program?.title,
                latestAttempt: latestAttempt ? {
                    id: latestAttempt.id,
                    startedAt: latestAttempt.started_at,
                    completedAt: latestAttempt.completed_at,
                    score: latestAttempt.score,
                    passed: latestAttempt.passed
                } : null,
                completed: latestAttempt?.completed_at !== null
            };
        });

        // Split into available and completed assessments
        const available = mappedAssessments.filter(a => !a.completed);
        const completed = mappedAssessments.filter(a => a.completed);

        return {
            success: true,
            data: {
                available,
                completed
            }
        };
    } catch (error) {
        console.error("Error in getPatientAssessments:", error);
        return handleServerError(error);
    }
}

/**
 * Submit assessment answers
 */
export async function submitAssessment(
    assessmentId: string,
    answers: any[]
): Promise<ActionResponse<any>> {
    try {
        // Validate inputs
        const validAssessmentId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

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

        // Create attempt record
        const { data: attempt, error } = await supabase
            .from("patient_assessment_attempts")
            .insert({
                patient_id: authUser.id,
                assessment_id: validAssessmentId,
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
            .eq("id", validAssessmentId)
            .single();

        const { data: questions } = await supabase
            .from("assessment_questions")
            .select("id, points")
            .eq("assessment_id", validAssessmentId);

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

        // Revalidate assessments page
        revalidatePath('/patient/assessments');

        return {
            success: true,
            data: updatedAttempt
        };
    } catch (error) {
        console.error("Error in submitAssessment:", error);
        return handleServerError(error);
    }
}

/**
 * Get assessment details with questions
 */
export async function getAssessment(assessmentId: string): Promise<ActionResponse<any>> {
    try {
        // Validate the assessmentId
        const validAssessmentId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

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

        // Get assessment with questions
        const { data, error } = await supabase
            .from("assessments")
            .select(`
        id,
        content_item_id,
        title,
        description,
        passing_score,
        time_limit_minutes,
        questions:assessment_questions(
          id,
          question_text,
          question_type,
          sequence_number,
          points,
          options:question_options(
            id,
            option_text,
            is_correct,
            sequence_number
          )
        )
      `)
            .eq("id", validAssessmentId)
            .single();

        if (error) throw error;

        // Sort questions and options by sequence
        if (data.questions) {
            data.questions.sort((a, b) => a.sequence_number - b.sequence_number);

            data.questions.forEach(question => {
                if (question.options) {
                    question.options.sort((a, b) => a.sequence_number - b.sequence_number);

                    // For client safety, hide which option is correct
                    if (question.question_type !== 'text_response') {
                        question.options.forEach(option => {
                            delete option.is_correct;
                        });
                    }
                }
            });
        }

        return { success: true, data };
    } catch (error) {
        console.error("Error in getAssessment:", error);
        return handleServerError(error);
    }
}