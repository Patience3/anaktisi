// app/(dashboard)/patient/programs/[programId]/modules/[moduleId]/page.tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getProgramModules, getModuleContent } from "@/lib/actions/patient/programs";
import { ModuleContentView } from "@/components/patient/module-content-view";

interface ModuleDetailPageProps {
    params: {
        programId: string;
        moduleId: string;
    };
}

export async function generateMetadata({ params }: ModuleDetailPageProps): Promise<Metadata> {
    const { programId, moduleId } = params;

    try {
        // Fetch module details
        const moduleResponse = await getProgramModules(programId);

        if (!moduleResponse.success) {
            return {
                title: "Module Details",
            };
        }

        const module = moduleResponse.data?.find(m => m.id === moduleId);

        if (!module) {
            return {
                title: "Module Not Found",
            };
        }

        return {
            title: `${module.title} | Program Module`,
            description: module.description || "View module content",
        };
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: "Module Details",
        };
    }
}

export default async function ModuleDetailPage({ params }: ModuleDetailPageProps) {
    const { programId, moduleId } = params;

    // Fetch module details
    const moduleResponse = await getProgramModules(programId);

    if (!moduleResponse.success) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col gap-4">
                    <Button variant="ghost" size="sm" asChild className="w-fit">
                        <Link href={`/patient/programs/${programId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Program
                        </Link>
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle>Error</CardTitle>
                            <CardDescription>
                                {moduleResponse.error?.message || "Failed to load module details"}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    // Find the module
    const module = moduleResponse.data?.find(m => m.id === moduleId);

    if (!module) {
        notFound();
    }

    // Fetch module content
    const contentResponse = await getModuleContent(moduleId);

    if (!contentResponse.success) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col gap-4">
                    <Button variant="ghost" size="sm" asChild className="w-fit">
                        <Link href={`/patient/programs/${programId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Program
                        </Link>
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle>{module.title}</CardTitle>
                            <CardDescription>
                                {module.description || "No description provided for this module."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-red-600">Error loading module content: {contentResponse.error?.message}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const contentItems = contentResponse.data || [];

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href={`/patient/programs/${programId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Program
                    </Link>
                </Button>

                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{module.title}</h1>
                    <p className="text-muted-foreground">
                        {module.description || "No description provided for this module."}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Module Content</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {contentItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">
                                        No content items available for this module yet.
                                    </p>
                                </div>
                            ) : (
                                <ModuleContentView
                                    contentItems={contentItems}
                                    programId={programId}
                                    moduleId={moduleId}
                                />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle>Module Navigation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Content Items</p>
                                <ul className="space-y-1">
                                    {contentItems.map((item, index) => (
                                        <li key={item.id}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-left h-auto py-2"
                                                asChild
                                            >
                                                <a href={`#item-${item.id}`}>
                                                    {index + 1}. {item.title}
                                                </a>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>

                                <Separator className="my-4" />

                                <Button className="w-full" asChild>
                                    <Link href={`/patient/programs/${programId}`}>
                                        Complete Module
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}