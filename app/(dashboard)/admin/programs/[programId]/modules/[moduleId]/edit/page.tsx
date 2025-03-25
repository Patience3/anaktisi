import { getModuleById } from "@/lib/actions/admin/module";
import { requireAdmin } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { EditModuleClient } from "./client";

interface EditModulePageProps {
    params: {
        programId: string;
        moduleId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditModulePageProps): Promise<Metadata> {
    const response = await getModuleById(params.moduleId);

    if (!response.success || !response.data) {
        return {
            title: "Edit Module - Not Found",
        };
    }

    return {
        title: `Edit Module - ${response.data.title}`,
    };
}

export default async function EditModulePage({ params }: EditModulePageProps) {
    // Check authorization
    await requireAdmin();

    // Fetch module data
    const response = await getModuleById(params.moduleId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const module = response.data;

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules/${module.id}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to module
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Edit Module</CardTitle>
                    <CardDescription>
                        Modify the details of {module.title}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EditModuleClient module={module} programId={params.programId} />
                </CardContent>
            </Card>
        </div>
    );
}