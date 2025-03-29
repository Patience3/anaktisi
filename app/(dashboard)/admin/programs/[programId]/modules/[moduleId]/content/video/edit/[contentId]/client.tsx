// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/video/edit/[contentId]/client.tsx

"use client";

import { ContentItem } from "@/lib/validations";
import { VideoContentForm } from "@/components/admin/video-content-form";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface VideoContentEditClientProps {
    contentItem: ContentItem;
    moduleId: string;
    programId: string;
}

export function VideoContentEditClient({ contentItem, moduleId, programId }: VideoContentEditClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (updatedContent: ContentItem) => {
        toast({
            title: "Content Updated",
            description: "The video content has been successfully updated.",
        });

        // Redirect back to content detail page
        router.push(`/admin/programs/${programId}/modules/${moduleId}/content/${contentItem.id}`);
    };

    return (
        <VideoContentForm
            contentItem={contentItem}
            moduleId={moduleId}
            onSuccess={handleSuccess}
        />
    );
}