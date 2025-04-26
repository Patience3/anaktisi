"use server";

import { createClient } from "@/utils/supabase/server";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";

// Define interfaces for joined table responses
interface ProgramEnrollment {
    id: string;
    patient_id: string;
    program_id: string;
    start_date: string;
    expected_end_date: string | null;
    completed_date: string | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'dropped';
    treatment_programs: {
        id: string;
        title: string;
        description: string | null;
        duration_days: number | null;
        is_self_paced: boolean;
    };
}

interface CategoryEnrollment {
    id: string;
    patient_id: string;
    category_id: string;
    assigned_at: string;
    program_categories: {
        id: string;
        name: string;
        description: string | null;
    };
}

// Get programs enrolled by a patient
export async function getPatientEnrolledPrograms(patientId: string): Promise<ActionResponse<PatientProgram[]>> {
    try {
        // Validate patientId
        const validPatientId = z.string().uuid("Invalid patient ID").parse(patientId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Check if patient exists
        const { data: patient, error: patientError } = await supabase
            .from("users")
            .select("id")
            .eq("id", validPatientId)
            .eq("role", "patient")
            .single();

        if (patientError) {
            throw new Error("Patient not found");
        }

        // Get patient's enrollments with program details
        const { data, error } = await supabase
            .from("patient_enrollments")
            .select(`
                id,
                patient_id,
                program_id,
                start_date,
                expected_end_date,
                completed_date,
                status,
                treatment_programs (
                    id,
                    title,
                    description,
                    duration_days,
                    is_self_paced
                )
            `)
            .eq("patient_id", validPatientId)
            .not("status", "eq", "dropped")
            .order("start_date", { ascending: false });

        if (error) {
            throw error;
        }

        // Type assertion with explicit casting
        const enrollments = data as ProgramEnrollment[];

        // Transform data to match our interface
        const patientPrograms: PatientProgram[] = enrollments.map(enrollment => ({
            id: enrollment.treatment_programs?.id || "",
            title: enrollment.treatment_programs?.title || "Unknown Program",
            description: enrollment.treatment_programs?.description,
            duration_days: enrollment.treatment_programs?.duration_days,
            is_self_paced: enrollment.treatment_programs?.is_self_paced || false,
            status: enrollment.status,
            start_date: enrollment.start_date,
            expected_end_date: enrollment.expected_end_date,
            completed_date: enrollment.completed_date,
            enrollment_id: enrollment.id
        }));

        return {
            success: true,
            data: patientPrograms
        };
    } catch (error) {
        console.error("Error in getPatientEnrolledPrograms:", error);
        return handleServerError(error);
    }
}
// Get patient's category enrollment
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