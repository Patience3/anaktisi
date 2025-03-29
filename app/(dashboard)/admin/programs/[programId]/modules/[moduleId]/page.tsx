import { getModuleById } from "@/lib/actions/admin/module";
import { getModuleContent } from "@/lib/actions/admin/content";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Clock,
    Edit,
    Trash2,
    PlusCircle,
    FileText,
    Video,
    Link as LinkIcon,
    FileSymlink,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeleteModuleButton } from "@/components/admin/delete-module-button";
import { ContentList } from "@/components/admin/content-list";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ModuleDetailsProps {
    params: {
        programId: string;
        moduleId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: ModuleDetailsProps): Promise<Metadata> {
    const response = await getModuleById(params.moduleId);

    if (!response.success || !response.data) {
        return {
            title: "Module Details - Not Found",
        };
    }

    return {
        title: `Module Details - ${response.data.title}`,
    };
}

export default async function ModuleDetails({ params }: ModuleDetailsProps) {
    // Check authorization
    await requireAdmin();

    // Fetch module data
    const response = await getModuleById(params.moduleId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const module = response.data;
    const createdAt = new Date(module.created_at);

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to modules
                    </Link>
                </Button>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">{module.title}</h1>
                    <div className="flex items-center gap-2">
                        <Badge variant={module.is_required ? "outline" : "secondary"}>
                            {module.is_required ? "Required" : "Optional"}
                        </Badge>
                        {module.estimated_minutes && (
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="mr-1 h-4 w-4" />
                                {module.estimated_minutes} minutes
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/programs/${params.programId}/modules/${module.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    <DeleteModuleButton module={module} programId={params.programId} />
                </div>
            </div>

            {/* Module Description */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-line">{module.description}</p>
                </CardContent>
            </Card>

            {/* Module Content */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle>Module Content</CardTitle>
                        <CardDescription>
                            Materials and activities for this module
                        </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <AddContentMenu programId={params.programId} moduleId={module.id} />
                    </div>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<TableSkeleton columns={3} rows={3} />}>
                        <ContentContainer programId={params.programId} moduleId={module.id} />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}

// This is a separate component to handle the "Add Content" dropdown button
function AddContentMenu({ programId, moduleId }: { programId: string; moduleId: string }) {
    return (
        <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
                <TabsTrigger value="document">Document</TabsTrigger>
                <TabsTrigger value="link">Link</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-4">
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/text/create`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Add Text Content
                    </Link>
                </Button>
            </TabsContent>
            <TabsContent value="video" className="space-y-4">
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/video/create`}>
                        <Video className="mr-2 h-4 w-4" />
                        Add Video Content
                    </Link>
                </Button>
            </TabsContent>
            <TabsContent value="document" className="space-y-4">
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/document/create`}>
                        <FileSymlink className="mr-2 h-4 w-4" />
                        Add Document
                    </Link>
                </Button>
            </TabsContent>
            <TabsContent value="link" className="space-y-4">
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/link/create`}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Add Link
                    </Link>
                </Button>
            </TabsContent>
        </Tabs>
    );
}

// This is a separate component to fetch and display content items
async function ContentContainer({ programId, moduleId }: { programId: string; moduleId: string }) {
    // Fetch content data
    const contentResponse = await getModuleContent(moduleId);
    const contentItems = contentResponse.success && contentResponse.data ? contentResponse.data : [];

    return <ContentList contentItems={contentItems} moduleId={moduleId} programId={programId} />;
}