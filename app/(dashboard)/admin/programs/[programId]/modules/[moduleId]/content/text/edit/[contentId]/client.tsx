// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/text/edit/[contentId]/client.tsx

"use client";

import { ContentItem } from "@/lib/validations";
import { TextContentForm } from "@/components/admin/text-content-form";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface TextContentEditClientProps {
    contentItem: ContentItem;
    moduleId: string;
    programId: string;
}

export function TextContentEditClient({ contentItem, moduleId, programId }: TextContentEditClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (updatedContent: ContentItem) => {
        toast({
            title: "Content Updated",
            description: "The text content has been successfully updated.",
        });

        // Redirect back to content detail page
        router.push(`/admin/programs/${programId}/modules/${moduleId}/content/${contentItem.id}`);
    };

    return (
        <TextContentForm
            contentItem={contentItem}
            moduleId={moduleId}
            onSuccess={handleSuccess}
        />
    );
}