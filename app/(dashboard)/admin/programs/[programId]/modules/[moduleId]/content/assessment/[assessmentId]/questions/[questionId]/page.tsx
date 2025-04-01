// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/questions/[questionId]/page.tsx
import { getQuestionById } from "@/lib/actions/admin/assessment";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { DeleteQuestionButton } from "@/components/admin/delete-question-button";

interface QuestionDetailsProps {
    params: {
        programId: string;
        moduleId: string;
        assessmentId: string;
        questionId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: QuestionDetailsProps): Promise<Metadata> {
    const response = await getQuestionById(params.questionId);

    if (!response.success || !response.data) {
        return {
            title: "Question Details - Not Found",
        };
    }

    return {
        title: `Question Details`,
    };
}

export default async function QuestionDetails({ params }: QuestionDetailsProps) {
    // Check authorization
    await requireAdmin();

    // Fetch question data
    const response = await getQuestionById(params.questionId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const question = response.data;

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${params.assessmentId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to assessment
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-2xl">Question Details</CardTitle>
                        <CardDescription>
                            View and manage question
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${params.assessmentId}/questions/${question.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </Button>
                        <DeleteQuestionButton
                            questionId={question.id}
                            assessmentId={params.assessmentId}
                            programId={params.programId}
                            moduleId={params.moduleId}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium mb-2">Question Text</h3>
                        <p className="whitespace-pre-line p-4 bg-slate-50 rounded-md border">{question.question_text}</p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="bg-slate-100 p-3 rounded-lg">
                            <span className="text-sm text-gray-500">Type</span>
                            <div className="font-medium capitalize">{question.question_type.replace('_', ' ')}</div>
                        </div>

                        <div className="bg-slate-100 p-3 rounded-lg">
                            <span className="text-sm text-gray-500">Points</span>
                            <div className="font-medium">{question.points}</div>
                        </div>

                        <div className="bg-slate-100 p-3 rounded-lg">
                            <span className="text-sm text-gray-500">Sequence</span>
                            <div className="font-medium">{question.sequence_number}</div>
                        </div>
                    </div>

                    {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && question.options && question.options.length > 0 && (
                        <div>
                            <h3 className="text-lg font-medium mb-2">Options</h3>
                            <div className="space-y-2">
                                {question.options.map((option: any) => (
                                    <div
                                        key={option.id}
                                        className={`p-3 rounded-md flex items-center ${option.is_correct ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full mr-3 ${option.is_correct ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                        <span>{option.option_text}</span>
                                        {option.is_correct && (
                                            <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-100">Correct</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {question.question_type === 'text_response' && (
                        <div>
                            <h3 className="text-lg font-medium mb-2">Response Type</h3>
                            <div className="p-4 bg-slate-50 rounded-md border">
                                <p className="text-gray-600">Free text response - answers will need to be manually reviewed</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}