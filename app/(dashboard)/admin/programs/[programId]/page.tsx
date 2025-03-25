import { getProgramById } from "@/lib/actions/admin/program";
import { getAllModules } from "@/lib/actions/admin/module";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Clock,
    Calendar,
    FileText,
    Users,
    Edit,
    Trash2,
    Power,
    PlusCircle,
    LayoutList
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeleteProgramButton } from "@/components/admin/delete-program-button";
import { ToggleProgramStatusButton } from "@/components/admin/toggle-program-status-button";
import { ModulesList } from "@/components/admin/modules-list";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/shared/table-skeleton";

interface ProgramDetailsProps {
    params: {
        programId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: ProgramDetailsProps): Promise<Metadata> {
    const response = await getProgramById(params.programId);

    if (!response.success || !response.data) {
        return {
            title: "Program Details - Not Found",
        };
    }

    return {
        title: `Program Details - ${response.data.title}`,
    };
}

export default async function ProgramDetails({ params }: ProgramDetailsProps) {
    // Check authorization
    await requireAdmin();

    // Fetch program data
    const response = await getProgramById(params.programId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const program = response.data;
    const createdAt = new Date(program.created_at);
    const updatedAt = new Date(program.updated_at);

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/programs" className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to programs
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Program Information */}
                <div className="col-span-1 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold">{program.title}</h1>
                            <div className="flex items-center gap-2">
                                <Badge variant={program.is_active ? "outline" : "destructive"}>
                                    {program.is_active ? "Active" : "Inactive"}
                                </Badge>
                                {program.category_name && (
                                    <Badge variant="secondary">{program.category_name}</Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/admin/programs/${program.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </Link>
                            </Button>
                            <ToggleProgramStatusButton program={program} />
                            <DeleteProgramButton program={program} />
                        </div>
                    </div>

                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-line">{program.description}</p>
                        </CardContent>
                    </Card>

                    {/* Modules Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle>Learning Modules</CardTitle>
                                <CardDescription>
                                    Content and activities for this program
                                </CardDescription>
                            </div>
                            <Link href={`/admin/programs/${program.id}/modules`}>
                                <Button variant="outline" size="sm">
                                    <LayoutList className="mr-2 h-4 w-4" />
                                    View All Modules
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<TableSkeleton columns={4} rows={3} />}>
                                <ModuleListContainer programId={program.id} />
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>

                {/* Program Details Sidebar */}
                <div className="col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Program Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Duration</span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {program.is_self_paced
                                            ? "Self-paced"
                                            : program.duration_days
                                                ? `${program.duration_days} days`
                                                : "Not specified"}
                                    </span>
                                </div>

                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Enrollments</span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {program.total_enrollments || 0} patients
                                    </span>
                                </div>

                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Modules</span>
                                    </div>
                                    <span className="text-sm font-medium">
                                        {program.total_modules || 0} modules
                                    </span>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Created by</span>
                                        <span className="text-sm">{program.created_by_name || "Unknown"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Created</span>
                                        <span className="text-sm" title={createdAt.toLocaleString()}>
                                            {createdAt.toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Last updated</span>
                                        <span className="text-sm" title={updatedAt.toLocaleString()}>
                                            {updatedAt.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// This is a separate component to fetch and display modules
async function ModuleListContainer({ programId }: { programId: string }) {
    // Fetch modules data
    const modulesResponse = await getAllModules(programId);
    const modules = modulesResponse.success && modulesResponse.data ? modulesResponse.data : [];

    // If no modules exist yet, show the "Add First Module" button
    if (modules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 border rounded-lg border-gray-200 bg-white">
                <div className="bg-slate-100 rounded-full p-4 mb-4">
                    <FileText className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold">No modules yet</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2 mb-6">
                    Get started by creating your first learning module. Modules help organize
                    your program content into logical sections.
                </p>
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules/create`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add First Module
                    </Link>
                </Button>
            </div>
        );
    }

    // If we have modules, show the first few with a link to view all
    return (
        <div className="space-y-4">
            {modules.slice(0, 3).map((module) => (
                <Card key={module.id}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <Link href={`/admin/programs/${programId}/modules/${module.id}`} className="hover:underline">
                                <CardTitle className="text-lg">{module.title}</CardTitle>
                            </Link>
                            <Badge variant="outline" className="ml-2">
                                {module.sequence_number}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {module.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant={module.is_required ? "secondary" : "outline"}>
                                {module.is_required ? "Required" : "Optional"}
                            </Badge>
                            {module.estimated_minutes && (
                                <Badge variant="outline">
                                    {module.estimated_minutes} minutes
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="ghost" size="sm" asChild className="ml-auto">
                            <Link href={`/admin/programs/${programId}/modules/${module.id}`}>
                                View Details
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}

            {modules.length > 3 && (
                <div className="text-center mt-4">
                    <Button variant="outline" asChild>
                        <Link href={`/admin/programs/${programId}/modules`}>
                            View All {modules.length} Modules
                        </Link>
                    </Button>
                </div>
            )}

            <div className="text-center mt-4">
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules/create`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Another Module
                    </Link>
                </Button>
            </div>
        </div>
    );
}