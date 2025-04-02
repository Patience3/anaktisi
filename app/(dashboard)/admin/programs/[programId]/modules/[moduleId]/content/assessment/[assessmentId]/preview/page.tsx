// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/preview/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, CheckCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Question {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'text_response';
    points: number;
    options?: {
        id: string;
        option_text: string;
        is_correct: boolean;
    }[];
}

interface Assessment {
    id: string;
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number | null;
    instructions?: string;
    questions: Question[];
}

export default function AssessmentPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const [assessment, setAssessment] = useState<Assessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    // Extract params safely
    const programId = params.programId as string;
    const moduleId = params.moduleId as string;
    const assessmentId = params.assessmentId as string;

    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                // In a real implementation, fetch data from your API
                // This is a mock implementation for preview

                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Mock assessment data for preview
                const mockAssessment: Assessment = {
                    id: assessmentId,
                    title: "Substance Abuse Risk Assessment",
                    description: "This assessment helps identify potential risk factors for substance abuse relapse.",
                    passing_score: 70,
                    time_limit_minutes: 15,
                    instructions: "Please answer all questions honestly. Your responses will help us personalize your treatment plan. There are no right or wrong answers.",
                    questions: [
                        {
                            id: "q1",
                            question_text: "How often do you experience cravings for substances?",
                            question_type: "multiple_choice",
                            points: 5,
                            options: [
                                { id: "o1", option_text: "Never", is_correct: false },
                                { id: "o2", option_text: "Rarely (once a month or less)", is_correct: false },
                                { id: "o3", option_text: "Sometimes (few times a month)", is_correct: false },
                                { id: "o4", option_text: "Often (weekly)", is_correct: true },
                                { id: "o5", option_text: "Daily", is_correct: false }
                            ]
                        },
                        {
                            id: "q2",
                            question_text: "I have a strong support system I can rely on when facing challenges.",
                            question_type: "true_false",
                            points: 3,
                            options: [
                                { id: "o6", option_text: "True", is_correct: true },
                                { id: "o7", option_text: "False", is_correct: false }
                            ]
                        },
                        {
                            id: "q3",
                            question_text: "Describe the situations or emotions that typically trigger your substance use.",
                            question_type: "text_response",
                            points: 5
                        },
                        {
                            id: "q4",
                            question_text: "Which coping strategies have you found most effective in avoiding relapse?",
                            question_type: "multiple_choice",
                            points: 4,
                            options: [
                                { id: "o8", option_text: "Exercise and physical activity", is_correct: true },
                                { id: "o9", option_text: "Meditation or mindfulness", is_correct: false },
                                { id: "o10", option_text: "Support group meetings", is_correct: false },
                                { id: "o11", option_text: "Engaging in hobbies", is_correct: false },
                                { id: "o12", option_text: "Talking with trusted friends/family", is_correct: false }
                            ]
                        },
                        {
                            id: "q5",
                            question_text: "Please describe your goals for recovery and treatment:",
                            question_type: "text_response",
                            points: 5
                        }
                    ]
                };

                setAssessment(mockAssessment);

                // Initialize timer if there's a time limit
                if (mockAssessment.time_limit_minutes) {
                    setTimeRemaining(mockAssessment.time_limit_minutes * 60);
                }
            } catch (error) {
                console.error("Error fetching assessment:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssessment();
    }, [assessmentId]);

    // Timer effect
    useEffect(() => {
        if (!timeRemaining) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev === null || prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    const handleAnswer = (questionId: string, value: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const goToNextQuestion = () => {
        if (!assessment) return;
        if (currentQuestionIndex < assessment.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const goToPrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (loading) {
        return (
            <div className="container mx-auto max-w-3xl">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="container mx-auto max-w-3xl">
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Assessment not found</h2>
                    <p className="mt-2 text-gray-600">The assessment could not be loaded.</p>
                    <Button asChild className="mt-4">
                        <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/assessment/${assessmentId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Assessment
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    const currentQuestion = assessment.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/assessment/${assessmentId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to assessment
                    </Link>
                </Button>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl">{assessment.title}</CardTitle>
                            <CardDescription className="mt-1">
                                Preview: This is how the assessment will appear to patients
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="px-3 py-1">
                            <Clock className="h-4 w-4 mr-1" />
                            {timeRemaining !== null
                                ? `Time remaining: ${formatTime(timeRemaining)}`
                                : 'No time limit'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pb-0">
                    <div className="pb-4">
                        <div className="flex justify-between text-sm text-muted-foreground mb-2">
                            <span>Progress</span>
                            <span>{currentQuestionIndex + 1} of {assessment.questions.length} questions</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>

                    {currentQuestionIndex === 0 && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                            <div className="flex gap-3">
                                <div className="bg-blue-500 text-white rounded-full p-1">
                                    <HelpCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-blue-800 mb-1">Instructions</h3>
                                    <p className="text-sm text-blue-700">{assessment.instructions}</p>

                                    <div className="mt-3 text-sm">
                                        <div className="flex items-center gap-1 text-blue-700">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Passing score: {assessment.passing_score}%</span>
                                        </div>
                                        {assessment.time_limit_minutes && (
                                            <div className="flex items-center gap-1 text-blue-700 mt-1">
                                                <Clock className="h-4 w-4" />
                                                <span>Time limit: {assessment.time_limit_minutes} minutes</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="py-4">
                        <div className="flex items-center mb-4">
                            <Badge variant="secondary" className="mr-2">Question {currentQuestionIndex + 1}</Badge>
                            <Badge variant="outline">{currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}</Badge>
                        </div>

                        <h3 className="text-lg font-medium mb-6">{currentQuestion.question_text}</h3>

                        {currentQuestion.question_type === 'multiple_choice' && (
                            <RadioGroup
                                value={answers[currentQuestion.id] || ""}
                                onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                                className="space-y-3"
                            >
                                {currentQuestion.options?.map(option => (
                                    <div key={option.id} className="flex items-center space-x-2 p-3 rounded-md border border-gray-200 hover:bg-slate-50 transition-colors">
                                        <RadioGroupItem value={option.id} id={option.id} />
                                        <Label htmlFor={option.id} className="flex-grow cursor-pointer">
                                            {option.option_text}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}

                        {currentQuestion.question_type === 'true_false' && (
                            <RadioGroup
                                value={answers[currentQuestion.id] || ""}
                                onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
                                className="space-y-3"
                            >
                                {currentQuestion.options?.map(option => (
                                    <div key={option.id} className="flex items-center space-x-2 p-3 rounded-md border border-gray-200 hover:bg-slate-50 transition-colors">
                                        <RadioGroupItem value={option.id} id={option.id} />
                                        <Label htmlFor={option.id} className="flex-grow cursor-pointer">
                                            {option.option_text}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}

                        {currentQuestion.question_type === 'text_response' && (
                            <Textarea
                                placeholder="Type your answer here..."
                                value={answers[currentQuestion.id] || ""}
                                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                                className="min-h-[150px]"
                            />
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between py-4">
                    <Button
                        variant="outline"
                        onClick={goToPrevQuestion}
                        disabled={currentQuestionIndex === 0}
                    >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>

                    {currentQuestionIndex < assessment.questions.length - 1 ? (
                        <Button onClick={goToNextQuestion}>
                            Next
                            <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    ) : (
                        <Button>
                            Submit Assessment
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Admin Preview Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">What Patients Will See</h3>
                            <p className="text-sm text-gray-700">
                                This preview shows exactly how patients will experience this assessment.
                                They will navigate through questions one at a time, with a progress bar indicating completion status.
                            </p>
                        </div>

                        <Separator />

                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Scoring System</h3>
                            <p className="text-sm text-gray-700">
                                Each question is worth {assessment.questions.reduce((sum, q) => sum + q.points, 0)} points total.
                                To pass, patients need to score at least {assessment.passing_score}%.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Time Limit</h3>
                            <p className="text-sm text-gray-700">
                                {assessment.time_limit_minutes
                                    ? `Patients will have ${assessment.time_limit_minutes} minutes to complete this assessment.`
                                    : "This assessment has no time limit."}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}