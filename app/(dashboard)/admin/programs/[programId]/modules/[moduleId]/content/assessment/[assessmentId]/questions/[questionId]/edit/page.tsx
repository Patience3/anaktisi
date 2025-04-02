// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/questions/[questionId]/edit/page.tsx
import { getQuestionById } from "@/lib/actions/admin/assessment";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { QuestionEditClient } from "./client";

interface EditQuestionPageProps {
    params: {
        programId: string;
        moduleId: string;
        assessmentId: string;
        questionId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditQuestionPageProps): Promise<Metadata> {
    const response = await getQuestionById(params.questionId);

    if (!response.success || !response.data) {
        return {
            title: "Edit Question - Not Found",
        };
    }

    return {
        title: `Edit Question`,
    };
}

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
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
                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${params.assessmentId}/questions/${params.questionId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to question
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Edit Question</CardTitle>
                    <CardDescription>
                        Update the question details
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <QuestionEditClient
                        question={question}
                        assessmentId={params.assessmentId}
                        programId={params.programId}
                        moduleId={params.moduleId}
                    />
                </CardContent>
            </Card>
        </div>
    );
}