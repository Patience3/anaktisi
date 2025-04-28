// lib/actions/patient/assessments.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";
import { handleServerError } from "@/lib/handlers/error";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Define typed interfaces that match the database schema
export interface Assessment {
    id: string;
    title: string;
    description: string | null;
    passing_score: number;
    time_limit_minutes: number | null;
    content_item_id: string;
    questions?: AssessmentQuestion[];
    content_item?: {
        id: string;
        module_id: string;
        title: string;
        content: string;
    };
}

export interface AssessmentQuestion {
    id: string;
    assessment_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'text_response';
    sequence_number: number;
    points: number;
    options?: QuestionOption[];
}

export interface QuestionOption {
    id: string;
    question_id: string;
    option_text: string;
    sequence_number: number;
    is_correct?: boolean;
}

export interface AssessmentAttempt {
    id: string;
    started_at: string;
    completed_at: string | null;
    score: number | null;
    passed: boolean | null;
}

export interface AssessmentWithProgress {
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

// Define answer types for submission
export interface AssessmentAnswer {
    questionId: string;
    questionType: 'multiple_choice' | 'true_false' | 'text_response';
    selectedOptionId?: string;
    textResponse?: string;
}

// Validation schema for assessment submission
const SubmitAnswerSchema = z.array(
    z.object({
        questionId: z.string().uuid(),
        questionType: z.enum(['multiple_choice', 'true_false', 'text_response']),
        selectedOptionId: z.string().uuid().optional(),
        textResponse: z.string().optional()
    })
);

/**
 * Get a specific assessment with questions for a patient
 */
export async function getAssessment(assessmentId: string): Promise<ActionResponse<Assessment>> {
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

        // Verify user is a patient
        const profile = await getUserProfile(authUser.id);
        if (!profile || profile.role !== 'patient') {
            return {
                success: false,
                error: {
                    message: "Access denied. Patient role required."
                },
                status: 403
            };
        }

        const supabase = await createClient();

        // Get assessment with questions and content item details
        const { data, error } = await supabase
            .from("assessments")
            .select(`
        id,
        title,
        description,
        passing_score,
        time_limit_minutes,
        content_item_id,
        content_item:content_items(
          id,
          module_id,
          title,
          content
        ),
        questions:assessment_questions(
          id,
          assessment_id,
          question_text,
          question_type,
          sequence_number,
          points,
          options:question_options(
            id,
            question_id,
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

        // Get the module ID from the content item
        const moduleId = data.content_item?.module_id;

        if (!moduleId) {
            return {
                success: false,
                error: {
                    message: "Assessment data is incomplete"
                },
                status: 400
            };
        }

        // Find the program ID from the module
        const { data: moduleData, error: moduleError } = await supabase
            .from("learning_modules")
            .select("program_id")
            .eq("id", moduleId)
            .single();

        if (moduleError) {
            throw moduleError;
        }

        // Check if patient is enrolled in this program
        const { data: enrollment, error: enrollmentError } = await supabase
            .from("patient_enrollments")
            .select("id")
            .eq("patient_id", authUser.id)
            .eq("program_id", moduleData.program_id)
            .not("status", "eq", "dropped")
            .maybeSingle();

        if (enrollmentError && enrollmentError.code !== 'PGRST116') {
            throw enrollmentError;
        }

        // If not enrolled, return an error
        if (!enrollment) {
            return {
                success: false,
                error: {
                    message: "You are not enrolled in this program"
                },
                status: 403
            };
        }

        // Sort questions by sequence number
        if (data.questions) {
            data.questions.sort((a, b) => a.sequence_number - b.sequence_number);

            // Sort options by sequence number
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
            data: data as Assessment
        };
    } catch (error) {
        console.error("Error in getAssessment:", error);
        return handleServerError(error);
    }
}

/**
 * Get all assessments for a patient's category
 */
export async function getPatientAssessments(categoryId: string): Promise<ActionResponse<{
    available: AssessmentWithProgress[];
    completed: AssessmentWithProgress[];
}>> {
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

        // Verify user is a patient
        const profile = await getUserProfile(authUser.id);
        if (!profile || profile.role !== 'patient') {
            return {
                success: false,
                error: {
                    message: "Access denied. Patient role required."
                },
                status: 403
            };
        }

        const supabase = await createClient();

        // Get all programs in the category that the patient is enrolled in
        const { data: enrollments, error: enrollmentError } = await supabase
            .from("patient_enrollments")
            .select(`
        id,
        program_id,
        treatment_programs!inner(
          id,
          title,
          category_id
        )
      `)
            .eq("patient_id", authUser.id)
            .eq("status", "in_progress");

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

        // Filter enrollments by categoryId
        const filteredEnrollments = enrollments.filter(
            enrollment => enrollment.treatment_programs.category_id === validCategoryId
        );

        if (filteredEnrollments.length === 0) {
            return {
                success: true,
                data: {
                    available: [],
                    completed: []
                }
            };
        }

        // Extract program IDs
        const programIds = filteredEnrollments.map(enrollment => enrollment.program_id);

        // Get all modules in these programs
        const { data: modules, error: modulesError } = await supabase
            .from("learning_modules")
            .select(`
        id,
        title,
        program_id,
        treatment_programs!inner(
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
        const formattedAssessments: AssessmentWithProgress[] = [];

        for (const assessment of assessments) {
            // Find related content item
            const contentItem = contentItems.find(item => item.id === assessment.content_item_id);
            if (!contentItem) continue;

            // Find related module
            const moduleItem = modules.find(mod => mod.id === contentItem.module_id);
            if (!moduleItem) continue;

            // Get program name
            const programName = moduleItem.treatment_programs ? moduleItem.treatment_programs.title : "Unknown Program";

            // Find all attempts for this assessment
            const assessmentAttempts = attempts?.filter(attempt =>
                attempt.assessment_id === assessment.id
            ) || [];

            // Get the latest attempt
            let latestAttempt = null;
            if (assessmentAttempts.length > 0) {
                latestAttempt = assessmentAttempts.sort((a, b) =>
                    new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
                )[0];
            }

            // Determine if the assessment is completed
            const isCompleted = latestAttempt &&
                latestAttempt.completed_at !== null &&
                latestAttempt.score !== null;

            formattedAssessments.push({
                id: assessment.id,
                title: assessment.title,
                description: assessment.description,
                passingScore: assessment.passing_score,
                timeLimit: assessment.time_limit_minutes,
                contentItemId: assessment.content_item_id,
                moduleId: contentItem.module_id,
                moduleName: moduleItem.title,
                programId: moduleItem.program_id,
                programName,
                latestAttempt: latestAttempt ? {
                    id: latestAttempt.id,
                    startedAt: latestAttempt.started_at,
                    completedAt: latestAttempt.completed_at,
                    score: latestAttempt.score,
                    passed: latestAttempt.passed
                } : null,
                completed: !!isCompleted
            });
        }

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
 * Submit assessment answers
 */
export async function submitAssessment(
    assessmentId: string,
    answers: AssessmentAnswer[]
): Promise<ActionResponse<{
    id: string;
    score: number;
    passed: boolean;
}>> {
    try {
        // Validate assessmentId
        const validAssessmentId = z.string().uuid("Invalid assessment ID").parse(assessmentId);

        // Validate answers
        const validAnswers = SubmitAnswerSchema.parse(answers);

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

        // Verify user is a patient
        const profile = await getUserProfile(authUser.id);
        if (!profile || profile.role !== 'patient') {
            return {
                success: false,
                error: {
                    message: "Access denied. Patient role required."
                },
                status: 403
            };
        }

        const supabase = await createClient();

        // Create assessment attempt
        const { data: attempt, error: attemptError } = await supabase
            .from("patient_assessment_attempts")
            .insert({
                patient_id: authUser.id,
                assessment_id: validAssessmentId,
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (attemptError) {
            throw attemptError;
        }

        // Process each answer
        for (const answer of validAnswers) {
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
        const passed = scorePercentage >= (assessment?.passing_score || 0);

        // Update attempt with score
        const { data: updatedAttempt, error: updateError } = await supabase
            .from("patient_assessment_attempts")
            .update({
                completed_at: new Date().toISOString(),
                score: scorePercentage,
                passed: passed
            })
            .eq("id", attempt.id)
            .select()
            .single();

        if (updateError) {
            console.error("Error updating attempt with score:", updateError);
            throw updateError;
        }

        // Revalidate related paths
        revalidatePath("/patient/assessments");

        return {
            success: true,
            data: {
                id: updatedAttempt.id,
                score: updatedAttempt.score || 0,
                passed: updatedAttempt.passed || false
            }
        };
    } catch (error) {
        console.error("Error in submitAssessment:", error);
        return handleServerError(error);
    }
}