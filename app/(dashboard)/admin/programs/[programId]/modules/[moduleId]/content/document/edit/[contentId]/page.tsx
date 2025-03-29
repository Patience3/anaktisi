// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/document/edit/[contentId]/page.tsx

import { getContentItem } from "@/lib/actions/admin/content";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { DocumentContentEditClient } from "./client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EditDocumentContentPageProps {
    params: {
        programId: string;
        moduleId: string;
        contentId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditDocumentContentPageProps): Promise<Metadata> {
    const response = await getContentItem(params.contentId);

    if (!response.success || !response.data) {
        return {
            title: "Edit Document Content - Not Found",
        };
    }

    return {
        title: `Edit Document Content - ${response.data.title}`,
    };
}

export default async function EditDocumentContentPage({ params }: EditDocumentContentPageProps) {
    // Check authorization
    await requireAdmin();

    // Fetch content data
    const response = await getContentItem(params.contentId);

    // Handle not found
    if (!response.success || !response.data || response.data.content_type !== 'document') {
        notFound();
    }

    const contentItem = response.data;

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/${params.contentId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to content
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Edit Document Content</CardTitle>
                    <CardDescription>
                        Update document content for the module
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DocumentContentEditClient
                        contentItem={contentItem}
                        moduleId={params.moduleId}
                        programId={params.programId}
                    />
                </CardContent>
            </Card>
        </div>
    );
}