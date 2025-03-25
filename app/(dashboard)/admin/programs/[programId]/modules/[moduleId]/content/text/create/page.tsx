"use client";

import { TextContentForm } from "@/components/admin/text-content-form";
import { useRouter } from "next/navigation";
import { ContentItem } from "@/lib/validations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";

interface CreateTextContentPageProps {
    params: {
        programId: string;
        moduleId: string;
    };
}

export default function CreateTextContentPage({ params }: CreateTextContentPageProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (content: ContentItem) => {
        toast({
            title: "Content Created",
            description: "The text content has been successfully created.",
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
                    <CardTitle className="text-2xl">Create Text Content</CardTitle>
                    <CardDescription>
                        Add text content to this module
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <TextContentForm
                        moduleId={params.moduleId}
                        onSuccess={handleSuccess}
                    />
                </CardContent>
            </Card>
        </div>
    );
}