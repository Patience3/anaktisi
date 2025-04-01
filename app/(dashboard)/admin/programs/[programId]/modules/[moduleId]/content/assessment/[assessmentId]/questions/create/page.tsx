// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/questions/create/page.tsx
"use client";

import { QuestionForm } from "@/components/admin/question-form";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

interface CreateQuestionPageProps {
    params: {
        programId: string;
        moduleId: string;
        assessmentId: string;
    };
}

export default function CreateQuestionPage({ params }: CreateQuestionPageProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (questionId: string) => {
        toast({
            title: "Question Created",
            description: "The question has been successfully created.",
        });

        // Redirect back to the assessment
        router.push(`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${params.assessmentId}`);
    };

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
                <CardHeader>
                    <CardTitle className="text-2xl">Create Question</CardTitle>
                    <CardDescription>
                        Add a question to the assessment
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <QuestionForm
                        assessmentId={params.assessmentId}
                        onSuccess={handleSuccess}
                    />
                </CardContent>
            </Card>
        </div>
    );
}