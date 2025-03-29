// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/document/edit/[contentId]/client.tsx

"use client";

import { ContentItem } from "@/lib/validations";
import { DocumentContentForm } from "@/components/admin/document-content-form";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface DocumentContentEditClientProps {
    contentItem: ContentItem;
    moduleId: string;
    programId: string;
}

export function DocumentContentEditClient({ contentItem, moduleId, programId }: DocumentContentEditClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (updatedContent: ContentItem) => {
        toast({
            title: "Content Updated",
            description: "The document content has been successfully updated.",
        });

        // Redirect back to content detail page
        router.push(`/admin/programs/${programId}/modules/${moduleId}/content/${contentItem.id}`);
    };

    return (
        <DocumentContentForm
            contentItem={contentItem}
            moduleId={moduleId}
            onSuccess={handleSuccess}
        />
    );
}