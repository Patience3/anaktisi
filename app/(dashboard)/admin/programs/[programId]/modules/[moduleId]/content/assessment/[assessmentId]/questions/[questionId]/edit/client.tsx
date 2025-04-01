// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/questions/[questionId]/edit/client.tsx
"use client";

import { QuestionForm } from "@/components/admin/question-form";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface QuestionEditClientProps {
    question: any;
    assessmentId: string;
    programId: string;
    moduleId: string;
}

export function QuestionEditClient({ question, assessmentId, programId, moduleId }: QuestionEditClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (questionId: string) => {
        toast({
            title: "Question Updated",
            description: "The question has been successfully updated.",
        });

        // Redirect back to assessment page
        router.push(`/admin/programs/${programId}/modules/${moduleId}/content/assessment/${assessmentId}`);
    };

    return (
        <QuestionForm
            question={question}
            assessmentId={assessmentId}
            onSuccess={handleSuccess}
        />
    );
}