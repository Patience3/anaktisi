import { getProgramById } from "@/lib/actions/admin/program";
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
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
// We'll use native Date formatting instead of date-fns
import { DeleteProgramButton } from "@/components/admin/delete-program-button";
import { ToggleProgramStatusButton } from "@/components/admin/toggle-program-status-button";

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

                    <Card>
                        <CardHeader>
                            <CardTitle>Modules</CardTitle>
                            <CardDescription>
                                Content and activities for this program
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg border-gray-200">
                                <div className="text-center">
                                    <FileText className="mx-auto h-10 w-10 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-semibold">No modules yet</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Get started by creating a new module
                                    </p>
                                    <div className="mt-4">
                                        <Button size="sm" asChild>
                                            <Link href={`/admin/programs/${program.id}/learning-modules/create`}>
                                                Add First Module
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
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