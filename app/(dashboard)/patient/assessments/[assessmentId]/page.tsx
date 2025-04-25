// app/(dashboard)/patient/assessments/[assessmentId]/page.tsx
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssessment } from "@/lib/actions/patient/programs";
import { AssessmentClient } from "@/components/patient/assessment-client";

interface AssessmentPageProps {
    params: {
        assessmentId: string;
    };
}

export async function generateMetadata({ params }: AssessmentPageProps): Promise<Metadata> {
    const { assessmentId } = params;

    try {
        // Fetch assessment details
        const assessmentResponse = await getAssessment(assessmentId);

        if (!assessmentResponse.success || !assessmentResponse.data) {
            return {
                title: "Assessment",
            };
        }

        const assessment = assessmentResponse.data;

        return {
            title: `${assessment.title} | Assessment`,
            description: assessment.description || "Take your assessment",
        };
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: "Assessment",
        };
    }
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
    const { assessmentId } = params;

    // Fetch assessment details
    const assessmentResponse = await getAssessment(assessmentId);

    if (!assessmentResponse.success) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col gap-4">
                    <Button variant="ghost" size="sm" asChild className="w-fit">
                        <Link href="/patient/programs">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Programs
                        </Link>
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle>Error</CardTitle>
                            <CardDescription>
                                {assessmentResponse.error?.message || "Failed to load assessment"}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    const assessment = assessmentResponse.data;

    if (!assessment) {
        notFound();
    }

    // Get content item details if needed
    const contentItem = assessment.content_item;

    // Parse content to get instructions
    let instructions = "";
    try {
        if (contentItem && contentItem.content) {
            const contentData = JSON.parse(contentItem.content);
            instructions = contentData.instructions || "";
        }
    } catch (e) {
        console.error("Error parsing content:", e);
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href="/patient/programs">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Programs
                    </Link>
                </Button>

                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{assessment.title}</h1>
                    <p className="text-muted-foreground">
                        {assessment.description || "Assessment"}
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Instructions</CardTitle>
                        <CardDescription>
                            Please read these instructions carefully before starting
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-blue max-w-none">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                                <p className="text-blue-800 whitespace-pre-wrap">
                                    {instructions || "Answer all questions to the best of your ability."}
                                </p>

                                <ul className="mt-4 text-blue-800">
                                    <li>This assessment contains {assessment.questions?.length || 0} questions.</li>
                                    {assessment.passing_score && (
                                        <li>Passing score: {assessment.passing_score}%</li>
                                    )}
                                    {assessment.time_limit_minutes && (
                                        <li>Time limit: {assessment.time_limit_minutes} minutes</li>
                                    )}
                                </ul>
                            </div>
                        </div>

                        <AssessmentClient
                            assessment={assessment}
                            contentItemId={assessment.content_item_id}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}