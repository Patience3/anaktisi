// Save this file to:
// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/document/create/page.tsx

"use client";

import { DocumentContentForm } from "@/components/admin/document-content-form";
import { useRouter } from "next/navigation";
import { ContentItem } from "@/lib/validations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

interface CreateDocumentContentPageProps {
    params: {
        programId: string;
        moduleId: string;
    };
}

export default function CreateDocumentContentPage({ params }: CreateDocumentContentPageProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (content: ContentItem) => {
        toast({
            title: "Document Added",
            description: "The document has been successfully added.",
        });

        // Redirect to the module detail page after successful creation
        router.push(`/admin/programs/${params.programId}/modules/${params.moduleId}`);
    };

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to module
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Add Document</CardTitle>
                    <CardDescription>
                        Add a document link to this module
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DocumentContentForm
                        moduleId={params.moduleId}
                        onSuccess={handleSuccess}
                    />
                </CardContent>
            </Card>
        </div>
    );
}