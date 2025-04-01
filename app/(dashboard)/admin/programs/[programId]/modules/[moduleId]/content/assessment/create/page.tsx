// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/create/page.tsx
"use client";

import { AssessmentForm } from "@/components/admin/assessment-form";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import React from "react";
import { useParams } from "next/navigation";

export default function CreateAssessmentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const params = useParams();

    // Extract params safely
    const programId = params.programId as string;
    const moduleId = params.moduleId as string;

    const handleSuccess = (result: { contentItemId: string, assessmentId: string }) => {
        toast({
            title: "Assessment Created",
            description: "The assessment has been successfully created.",
        });

        // Redirect to the assessment detail page
        router.push(`/admin/programs/${programId}/modules/${moduleId}/content/assessment/${result.assessmentId}`);
    };

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${programId}/modules/${moduleId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to module
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Create Assessment</CardTitle>
                    <CardDescription>
                        Create an assessment to evaluate patient understanding
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AssessmentForm
                        moduleId={moduleId}
                        onSuccess={handleSuccess}
                    />
                </CardContent>
            </Card>
        </div>
    );
}