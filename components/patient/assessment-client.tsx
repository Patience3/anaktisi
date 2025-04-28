// components/patient/assessment-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitAssessment } from "@/lib/actions/patient/assessments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import {
    Assessment,
    AssessmentQuestion,
    QuestionOption,
    AssessmentAnswer
} from "@/lib/actions/patient/assessments";
import { MultipleChoiceQuestion } from "./assessment/multiple-choice";
import { TrueFalseQuestion } from "./assessment/true-false";
import { TextResponseQuestion } from "./assessment/text-response";

interface AssessmentClientProps {
    assessment: Assessment;
    contentItemId: string;
}

interface SubmissionResult {
    id: string;
    score: number;
    passed: boolean;
}

export function AssessmentClient({ assessment, contentItemId }: AssessmentClientProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<SubmissionResult | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    const questions = assessment.questions || [];
    const totalQuestions = questions.length;
    const currentQuestion = questions[currentQuestionIndex] || null;

    // If no questions, show message
    if (totalQuestions === 0) {
        return (
            <div className="py-8 text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Questions Available</h3>
                <p className="text-muted-foreground mb-6">
                    This assessment doesn't have any questions yet.
                </p>
            </div>
        );
    }

    // If assessment is complete, show result
    if (result) {
        const passed = result.passed;
        const score = result.score;

        return (
            <div className="py-8 text-center">
                {passed ? (
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                ) : (
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                )}

                <h3 className="text-xl font-medium mb-2">
                    Assessment {passed ? "Passed" : "Not Passed"}
                </h3>

                <div className="mb-6">
                    <div className="text-5xl font-bold mb-2 text-center">
                        {score}%
                    </div>
                    <p className="text-muted-foreground">
                        {passed
                            ? `Congratulations! You passed with a score of ${score}%.`
                            : `You scored ${score}%. The passing score is ${assessment.passing_score}%.`}
                    </p>
                </div>

                <div className="flex justify-center gap-4">
                    <Button onClick={() => router.back()}>
                        Return to Module
                    </Button>
                </div>
            </div>
        );
    }

    // Handle answer selection
    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    // Handle next question
    const handleNext = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    // Handle previous question
    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    // Handle assessment submission
    const handleSubmit = async () => {
        // Check if all questions answered
        const answeredCount = Object.keys(answers).length;
        if (answeredCount < totalQuestions) {
            const unanswered = totalQuestions - answeredCount;
            toast({
                title: "Incomplete Assessment",
                description: `You have ${unanswered} unanswered ${unanswered === 1 ? 'question' : 'questions'}.`,
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Format answers for submission
            const formattedAnswers: AssessmentAnswer[] = questions.map(question => {
                const answer = answers[question.id];

                if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
                    return {
                        questionId: question.id,
                        questionType: question.question_type,
                        selectedOptionId: answer
                    };
                } else if (question.question_type === 'text_response') {
                    return {
                        questionId: question.id,
                        questionType: question.question_type,
                        textResponse: answer
                    };
                } else {
                    // This should never happen, but TypeScript requires a return value
                    return {
                        questionId: question.id,
                        questionType: 'text_response', // Default fallback
                        textResponse: ''
                    };
                }
            });

            // Submit assessment
            const response = await submitAssessment(assessment.id, formattedAnswers);

            if (response.success && response.data) {
                setResult(response.data);
            } else {
                toast({
                    title: "Error",
                    description: response.error?.message || "Failed to submit assessment",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error submitting assessment:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate progress percentage
    const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;

    return (
        <div className="mt-6">
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                    <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                    <span>{Math.round(progressPercentage)}% Complete</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
            </div>

            {currentQuestion && (
                <Card className="p-6 mb-6">
                    <div className="mb-6">
                        <div className="text-lg font-medium mb-4">
                            {currentQuestionIndex + 1}. {currentQuestion.question_text}
                        </div>

                        {/* Render appropriate question type */}
                        {currentQuestion.question_type === 'multiple_choice' && (
                            <MultipleChoiceQuestion
                                question={currentQuestion}
                                selectedOptionId={answers[currentQuestion.id]}
                                onSelectOption={(optionId) => handleAnswer(currentQuestion.id, optionId)}
                            />
                        )}

                        {currentQuestion.question_type === 'true_false' && (
                            <TrueFalseQuestion
                                question={currentQuestion}
                                selectedOptionId={answers[currentQuestion.id]}
                                onSelectOption={(optionId) => handleAnswer(currentQuestion.id, optionId)}
                            />
                        )}

                        {currentQuestion.question_type === 'text_response' && (
                            <TextResponseQuestion
                                question={currentQuestion}
                                response={answers[currentQuestion.id] || ''}
                                onResponseChange={(text) => handleAnswer(currentQuestion.id, text)}
                            />
                        )}
                    </div>

                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentQuestionIndex === 0}
                        >
                            Previous
                        </Button>

                        {currentQuestionIndex < totalQuestions - 1 ? (
                            <Button
                                onClick={handleNext}
                                disabled={!answers[currentQuestion.id]}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !answers[currentQuestion.id]}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    "Submit Assessment"
                                )}
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            <div className="flex justify-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {assessment.time_limit_minutes
                        ? `Time limit: ${assessment.time_limit_minutes} minutes`
                        : "No time limit"}
                </div>
            </div>
        </div>
    );
}