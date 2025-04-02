// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/edit/client.tsx
"use client";

import { AssessmentForm } from "@/components/admin/assessment-form";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface AssessmentEditClientProps {
    assessment: any;
    moduleId: string;
    programId: string;
}

export function AssessmentEditClient({ assessment, moduleId, programId }: AssessmentEditClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    // Extract content data for the form
    let instructions = "";
    const description = assessment.description || "";

    if (assessment.content_item?.content) {
        try {
            const contentData = JSON.parse(assessment.content_item.content);
            instructions = contentData.instructions || "";
        } catch (e) {
            console.error("Failed to parse content JSON:", e);
        }
    }

    const handleSuccess = (result: { contentItemId: string, assessmentId: string }) => {
        toast({
            title: "Assessment Updated",
            description: "The assessment has been successfully updated.",
        });

        // Redirect to the assessment detail page
        router.push(`/admin/programs/${programId}/modules/${moduleId}/content/assessment/${assessment.id}`);
    };

    return (
        <AssessmentForm
            assessment={{
                id: assessment.id,
                title: assessment.title,
                description: description,
                passing_score: assessment.passing_score,
                time_limit_minutes: assessment.time_limit_minutes,
                content_item: assessment.content_item
            }}
            moduleId={moduleId}
            onSuccess={handleSuccess}
        />
    );
}