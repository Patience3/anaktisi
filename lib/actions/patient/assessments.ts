"use server";

import { createClient } from "@/utils/supabase/server";
import { handleServerError } from "@/lib/handlers/error";
import { getAuthUserSafe } from "@/lib/auth-utils";
import { z } from "zod";

/**
 * Interface for assessment data
 */
interface Assessment {
    id: string;
    title: string;
    description: string | null;
    passingScore: number;
    timeLimit?: number | null;
    contentItemId: string;
    moduleId: string;
    moduleName: string;
    programId: string;
    programName: string;
    latestAttempt?: {
        id: string;
        startedAt: string;
        completedAt?: string | null;
        score?: number | null;
        passed?: boolean | null;
    } | null;
    completed: boolean;
}

/**
 * Get all assessments for a patient's category
 */
export async function getPatientAssessments(categoryId: string): Promise<ActionResponse<{ available: Assessment[], completed: Assessment[] }>> {
    try {
        // Validate categoryId
        const validCategoryId = z.string().uuid("Invalid category ID").parse(categoryId);

        // Get authenticated user
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

        // Get all programs in the category that the patient is enrolled in
        const { data: enrollments, error: enrollmentError } = await supabase
            .from("patient_enrollments")
            .select(`
                id,
                program_id,
                treatment_programs(
                    id,
                    title,
                    category_id
                )
            `)
            .eq("patient_id", authUser.id)
            .eq("status", "in_progress")
            .filter("treatment_programs.category_id", "eq", validCategoryId);

        if (enrollmentError) {
            throw enrollmentError;
        }

        // If no enrollments, return empty arrays
        if (!enrollments || enrollments.length === 0) {
            return {
                success: true,
                data: {
                    available: [],
                    completed: []
                }
            };
        }

        // Extract program IDs
        const programIds = enrollments.map(enrollment => enrollment.program_id);

        // Get all modules in these programs
        const { data: modules, error: modulesError } = await supabase
            .from("learning_modules")
            .select(`
                id,
                title,
                program_id,
                treatment_programs(
                    title
                )
            `)
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

        // Extract module IDs
        const moduleIds = modules.map(module => module.id);

        // Get assessment content items in these modules
        const { data: contentItems, error: contentError } = await supabase
            .from("content_items")
            .select(`
                id,
                title,
                module_id,
                content_type
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

        // Extract content item IDs
        const contentItemIds = contentItems.map(item => item.id);

        // Get assessments for these content items
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

        if (!assessments || assessments.length === 0) {
            return {
                success: true,
                data: {
                    available: [],
                    completed: []
                }
            };
        }

        // Get patient's assessment attempts
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

        // Process and format assessment data
        const formattedAssessments: Assessment[] = assessments.map(assessment => {
            // Find related content item
            const contentItem = contentItems.find(item => item.id === assessment.content_item_id);

            if (!contentItem) {
                // This shouldn't happen, but handle it just in case
                return null;
            }

            // Find related module
            const module = modules.find(mod => mod.id === contentItem.module_id);

            if (!module) {
                // This shouldn't happen, but handle it just in case
                return null;
            }

            // Find all attempts for this assessment
            const assessmentAttempts = attempts ?
                attempts.filter(attempt => attempt.assessment_id === assessment.id) : [];

            // Get the latest attempt
            const latestAttempt = assessmentAttempts.length > 0 ?
                assessmentAttempts.sort((a, b) =>
                    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
                )[0] : null;

            // Determine if the assessment is completed
            const isCompleted = latestAttempt &&
                latestAttempt.completed_at !== null &&
                latestAttempt.score !== null;

            return {
                id: assessment.id,
                title: assessment.title,
                description: assessment.description,
                passingScore: assessment.passing_score,
                timeLimit: assessment.time_limit_minutes,
                contentItemId: assessment.content_item_id,
                moduleId: contentItem.module_id,
                moduleName: module.title,
                programId: module.program_id,
                programName: module.treatment_programs?.title || "Unknown Program",
                latestAttempt: latestAttempt ? {
                    id: latestAttempt.id,
                    startedAt: latestAttempt.started_at,
                    completedAt: latestAttempt.completed_at,
                    score: latestAttempt.score,
                    passed: latestAttempt.passed
                } : null,
                completed: !!isCompleted
            };
        }).filter(Boolean) as Assessment[];

        // Split into available and completed assessments
        const available = formattedAssessments.filter(a => !a.completed);
        const completed = formattedAssessments.filter(a => a.completed);

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
 * Get a specific assessment with questions
 */
export async function getAssessment(assessmentId: string): Promise<ActionResponse<any>> {
    try {
        // Validate assessmentId
        const validAssessmentId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

        // Get authenticated user
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
                content_item:content_item_id(
                    id,
                    title,
                    content
                ),
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

        if (error) {
            throw error;
        }

        // Sort questions by sequence number
        if (data.questions) {
            data.questions.sort((a, b) => a.sequence_number - b.sequence_number);

            // Sort options by sequence number and hide is_correct for client safety
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

        return {
            success: true,
            data
        };
    } catch (error) {
        console.error("Error in getAssessment:", error);
        return handleServerError(error);
    }
}

/**
 * Submit assessment answers
 */
/**
 * Submit assessment answers
 */
export async function submitAssessment(
    assessmentId: string,
    answers: any[]
): Promise<ActionResponse<any>> {
    try {
        // Validate assessmentId and answers
        const validAssessmentId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

        if (!Array.isArray(answers) || answers.length === 0) {
            return {
                success: false,
                error: {
                    message: "No answers provided"
                },
                status: 400
            };
        }

        // Get authenticated user
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
            if (!answer.questionId) {
                console.warn("Skipping answer with no questionId");
                continue;
            }

            if (answer.questionType === 'multiple_choice' || answer.questionType === 'true_false') {
                if (!answer.selectedOptionId) {
                    console.warn(`Skipping ${answer.questionType} answer with no selectedOptionId`);
                    continue;
                }

                // Get question points
                const { data: question, error: questionError } = await supabase
                    .from("assessment_questions")
                    .select("points")
                    .eq("id", answer.questionId)
                    .single();

                if (questionError) {
                    console.error(`Error getting question ${answer.questionId}:`, questionError);
                    continue;
                }

                // Get correct option
                const { data: correctOption, error: optionError } = await supabase
                    .from("question_options")
                    .select("id")
                    .eq("question_id", answer.questionId)
                    .eq("is_correct", true)
                    .single();

                if (optionError) {
                    console.error(`Error getting correct option for question ${answer.questionId}:`, optionError);
                    continue;
                }

                // Check if answer is correct
                const isCorrect = answer.selectedOptionId === correctOption?.id;
                const points = question?.points || 0;

                // Insert response
                const { error: responseError } = await supabase
                    .from("patient_question_responses")
                    .insert({
                        attempt_id: attempt.id,
                        question_id: answer.questionId,
                        selected_option_id: answer.selectedOptionId,
                        is_correct: isCorrect,
                        points_earned: isCorrect ? points : 0
                    });

                if (responseError) {
                    console.error(`Error saving response for question ${answer.questionId}:`, responseError);
                }
            } else if (answer.questionType === 'text_response') {
                // Text responses need manual review
                const { error: responseError } = await supabase
                    .from("patient_question_responses")
                    .insert({
                        attempt_id: attempt.id,
                        question_id: answer.questionId,
                        text_response: answer.textResponse || "",
                        is_correct: null,
                        points_earned: 0
                    });

                if (responseError) {
                    console.error(`Error saving text response for question ${answer.questionId}:`, responseError);
                }
            }
        }

        // Calculate score
        const { data: responses, error: responsesError } = await supabase
            .from("patient_question_responses")
            .select("points_earned")
            .eq("attempt_id", attempt.id)
            .not("is_correct", "is", null);

        if (responsesError) {
            console.error("Error getting responses for scoring:", responsesError);
            throw responsesError;
        }

        const { data: assessment, error: assessmentError } = await supabase
            .from("assessments")
            .select("passing_score")
            .eq("id", validAssessmentId)
            .single();

        if (assessmentError) {
            console.error("Error getting assessment for scoring:", assessmentError);
            throw assessmentError;
        }

        const { data: questions, error: questionsError } = await supabase
            .from("assessment_questions")
            .select("id, points")
            .eq("assessment_id", validAssessmentId);

        if (questionsError) {
            console.error("Error getting questions for scoring:", questionsError);
            throw questionsError;
        }

        // Calculate score as percentage
        const totalPossiblePoints = questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 1; // Default to 1 to avoid division by zero
        const earnedPoints = responses?.reduce((sum, r) => sum + (r.points_earned || 0), 0) || 0;
        const scorePercentage = Math.round((earnedPoints / totalPossiblePoints) * 100);

        // Update attempt with score
        const { data: updatedAttempt, error: updateError } = await supabase
            .from("patient_assessment_attempts")
            .update({
                completed_at: new Date().toISOString(),
                score: scorePercentage,
                passed: scorePercentage >= (assessment?.passing_score || 0)
            })
            .eq("id", attempt.id)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating attempt with score:", updateError);
            throw updateError;
        }

        return {
            success: true,
            data: updatedAttempt
        };
    } catch (error) {
        console.error("Error in submitAssessment:", error);
        return handleServerError(error);
    }
}