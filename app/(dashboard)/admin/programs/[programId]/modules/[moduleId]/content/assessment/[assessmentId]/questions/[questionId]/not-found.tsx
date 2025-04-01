// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/questions/[questionId]/not-found.tsx
'use client'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { useParams } from "next/navigation";

export default function QuestionNotFound() {
    const params = useParams<{ programId: string; moduleId: string; assessmentId: string }>();

    return (
        <div className="container mx-auto flex flex-col items-center justify-center py-20">
            <div className="text-center">
                <div className="flex justify-center">
                    <div className="bg-red-50 rounded-full p-6 mb-6">
                        <FileQuestion className="h-20 w-20 text-red-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold mb-2">Question Not Found</h1>
                <p className="text-muted-foreground text-lg mb-8">
                    The question you are looking for does not exist or has been deleted.
                </p>
                <Button asChild>
                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/assessment/${params.assessmentId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Assessment
                    </Link>
                </Button>
            </div>
        </div>
    );
}