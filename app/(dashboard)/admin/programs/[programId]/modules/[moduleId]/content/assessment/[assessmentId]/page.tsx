// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/page.tsx
import { getAssessmentById } from "@/lib/actions/admin/assessment";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Clock, FileText, PlusCircle, CheckCircle, HelpCircle, Eye } from "lucide-react";
import Link from "next/link";
import { DeleteAssessmentButton } from "@/components/admin/delete-assessment-button";
import { Separator } from "@/components/ui/separator";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/shared/table-skeleton";

// Define interfaces for the assessment data structure
interface AssessmentWithContent {
    id: string;
    content_item_id: string;
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    content_item?: {
        id: string;
        module_id: string;
        title: string;
        content_type: string;
        content: string;
        sequence_number: number;
        created_by: string;
        created_at: string;
        updated_at: string;
    };
    questions?: AssessmentQuestion[];
}

interface AssessmentQuestion {
    id: string;
    assessment_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'text_response';
    sequence_number: number;
    points: number;
    created_at: string;
    updated_at: string;
    options?: QuestionOption[];
}

interface QuestionOption {
    id: string;
    question_id: string;
    option_text: string;
    is_correct: boolean;
    sequence_number: number;
    created_at: string;
    updated_at: string;
}

interface ContentData {
    description: string;
    instructions: string;
}

interface AssessmentDetailsProps {
    params: {
        programId: string;
        moduleId: string;
        assessmentId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: AssessmentDetailsProps): Promise<Metadata> {
    const response = await getAssessmentById(params.assessmentId);

    if (!response.success || !response.data) {
        return {
            title: "Assessment Details - Not Found",
        };
    }

    return {
        title: `Assessment Details - ${response.data.title}`,
    };
}

export default async function AssessmentDetails({ params }: AssessmentDetailsProps) {
    // Check authorization
    await requireAdmin();

    // Fetch assessment data
    const response = await getAssessmentById(params.assessmentId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const assessment = response.data as AssessmentWithContent;
    const createdAt = new Date(assessment.created_at);

    // Parse content JSON to get instructions
    let instructions = "";
    if (assessment.content_item?.content) {
        try {
            const contentData = JSON.parse(assessment.content_item.content) as ContentData;
            instructions = contentData.instructions || "";
        } catch (e) {
            console.error("Failed to parse content JSON:", e);
        }
    }

    // Calculate total points from questions
    const totalPoints = assessment.questions?.reduce((sum, q) => sum + q.points, 0) || 0;
    const questionsCount = assessment.questions?.length || 0;

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to module
                    </Link>
                </Button>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">{assessment.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <span>Assessment</span>
                        <span>•</span>
                        <span>{questionsCount} question{questionsCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>Created {createdAt.toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${assessment.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Assessment
                        </Link>
                    </Button>
                    <DeleteAssessmentButton
                        assessmentId={assessment.id}
                        contentItemId={assessment.content_item_id}
                        moduleId={params.moduleId}
                        programId={params.programId}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Assessment Overview */}
                <div className="col-span-1 lg:col-span-2">
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Assessment Overview</CardTitle>
                            <CardDescription>Details and settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-lg font-medium mb-2">Description</h3>
                                <p className="text-muted-foreground whitespace-pre-line">{assessment.description}</p>
                            </div>

                            {instructions && (
                                <div>
                                    <h3 className="text-lg font-medium mb-2">Instructions</h3>
                                    <p className="text-muted-foreground whitespace-pre-line">{instructions}</p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4 mt-4">
                                <div className="bg-slate-100 p-3 rounded-lg flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <div>
                                        <div className="text-sm font-medium">Passing Score</div>
                                        <div className="text-2xl font-bold">{assessment.passing_score}%</div>
                                    </div>
                                </div>

                                {assessment.time_limit_minutes && (
                                    <div className="bg-slate-100 p-3 rounded-lg flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-orange-500" />
                                        <div>
                                            <div className="text-sm font-medium">Time Limit</div>
                                            <div className="text-2xl font-bold">{assessment.time_limit_minutes} min</div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-100 p-3 rounded-lg flex items-center gap-2">
                                    <HelpCircle className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <div className="text-sm font-medium">Questions</div>
                                        <div className="text-2xl font-bold">{questionsCount}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-100 p-3 rounded-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    <div>
                                        <div className="text-sm font-medium">Total Points</div>
                                        <div className="text-2xl font-bold">{totalPoints}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Questions section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle>Questions</CardTitle>
                                <CardDescription>
                                    Assessment questions and answers
                                </CardDescription>
                            </div>
                            <Button asChild>
                                <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${assessment.id}/questions/create`}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Question
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {assessment.questions && assessment.questions.length > 0 ? (
                                <div className="space-y-6">
                                    {assessment.questions.map((question, index) => (
                                        <div key={question.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="rounded-full px-3 py-1 font-normal">
                                                        {index + 1}
                                                    </Badge>
                                                    <h3 className="text-lg font-medium">{question.question_text}</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="capitalize">{question.question_type.replace('_', ' ')}</Badge>
                                                    <Badge variant="outline">{question.points} {question.points === 1 ? 'point' : 'points'}</Badge>
                                                </div>
                                            </div>

                                            {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
                                                <div className="ml-8 space-y-2">
                                                    {question.options?.map((option) => (
                                                        <div key={option.id} className={`flex items-center p-2 rounded ${option.is_correct ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}`}>
                                                            <div className={`w-4 h-4 rounded-full mr-2 ${option.is_correct ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                            <span>{option.option_text}</span>
                                                            {option.is_correct && (
                                                                <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">Correct</Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {question.question_type === 'text_response' && (
                                                <div className="ml-8 bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
                                                    <p className="text-muted-foreground">Free text response</p>
                                                </div>
                                            )}

                                            <div className="flex justify-end mt-4">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${assessment.id}/questions/${question.id}/edit`}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Question
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-10 border rounded-lg border-dashed bg-slate-50">
                                    <HelpCircle className="h-10 w-10 text-muted-foreground mb-2" />
                                    <h3 className="text-lg font-medium mb-1">No questions yet</h3>
                                    <p className="text-muted-foreground text-center max-w-md mb-4">
                                        This assessment does not have any questions yet. Add questions to complete your assessment.
                                    </p>
                                    <Button asChild>
                                        <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${assessment.id}/questions/create`}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add First Question
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button className="w-full" asChild>
                                <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${assessment.id}/questions/create`}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Question
                                </Link>
                            </Button>

                            <Button variant="outline" className="w-full" asChild>
                                <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${assessment.id}/preview`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Preview Assessment
                                </Link>
                            </Button>

                            <Separator />

                            <Button variant="outline" className="w-full" asChild>
                                <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${assessment.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Assessment
                                </Link>
                            </Button>

                            <Button variant="destructive" className="w-full" asChild>
                                <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}`}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Module
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}