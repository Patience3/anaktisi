// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/edit/page.tsx
import { getAssessmentById } from "@/lib/actions/admin/assessment";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AssessmentEditClient } from "./client";

interface EditAssessmentPageProps {
    params: {
        programId: string;
        moduleId: string;
        assessmentId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditAssessmentPageProps): Promise<Metadata> {
    const response = await getAssessmentById(params.assessmentId);

    if (!response.success || !response.data) {
        return {
            title: "Edit Assessment - Not Found",
        };
    }

    return {
        title: `Edit Assessment - ${response.data.title}`,
    };
}

export default async function EditAssessmentPage({ params }: EditAssessmentPageProps) {
    // Check authorization
    await requireAdmin();

    // Fetch assessment data
    const response = await getAssessmentById(params.assessmentId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const assessment = response.data;

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
                    <CardTitle className="text-2xl">Edit Assessment</CardTitle>
                    <CardDescription>
                        Update assessment details
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AssessmentEditClient
                        assessment={assessment}
                        moduleId={params.moduleId}
                        programId={params.programId}
                    />
                </CardContent>
            </Card>
        </div>
    );
}