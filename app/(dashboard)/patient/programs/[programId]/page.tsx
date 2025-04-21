// app/(dashboard)/patient/programs/[programId]/page.tsx
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCategoryPrograms, enrollInProgram } from "@/lib/actions/patient/program";
import { ProgramModulesList } from "@/components/patient/program-modules-list";

interface ProgramDetailPageProps {
    params: {
        programId: string;
    };
}

export async function generateMetadata({ params }: ProgramDetailPageProps): Promise<Metadata> {
    const programId = params.programId;

    try {
        // We'll use the category programs endpoint to get program details
        // Not the most efficient approach but works for now
        const categoryResponse = await getCategoryPrograms("all"); // The server action handles authentication

        if (!categoryResponse.success) {
            return {
                title: "Program Details",
            };
        }

        const program = categoryResponse.data?.find(p => p.id === programId);

        if (!program) {
            return {
                title: "Program Not Found",
            };
        }

        return {
            title: `${program.title} | Patient Programs`,
            description: program.description || "View program details and modules",
        };
    } catch (error) {
        console.error("Error generating metadata:", error);
        return {
            title: "Program Details",
        };
    }
}

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
    const programId = params.programId;

    // Fetch program details and check enrollment
    const categoryResponse = await getCategoryPrograms("all");

    if (!categoryResponse.success) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col gap-4">
                    <Button variant="ghost" size="sm" asChild className="w-fit">
                        <Link href="/patient/programs">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Programs
                        </Link>
                    </Button>

                    <Card>
                        <CardHeader>
                            <CardTitle>Error</CardTitle>
                            <CardDescription>
                                {categoryResponse.error?.message || "Failed to load program details"}
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        );
    }

    // Find the program in question
    const program = categoryResponse.data?.find(p => p.id === programId);

    if (!program) {
        notFound();
    }

    // Check if user is enrolled
    const isEnrolled = !!program.enrollment;

    // If not enrolled, enroll them first
    if (!isEnrolled) {
        const enrollmentResponse = await enrollInProgram(programId);

        if (!enrollmentResponse.success) {
            return (
                <div className="container mx-auto py-6">
                    <div className="flex flex-col gap-4">
                        <Button variant="ghost" size="sm" asChild className="w-fit">
                            <Link href="/patient/programs">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Programs
                            </Link>
                        </Button>

                        <Card>
                            <CardHeader>
                                <CardTitle>Enrollment Error</CardTitle>
                                <CardDescription>
                                    {enrollmentResponse.error?.message || "Failed to enroll in program"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild>
                                    <Link href="/patient/programs">Return to Programs</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href="/patient/programs">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Programs
                    </Link>
                </Button>

                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{program.title}</h1>
                    <p className="text-muted-foreground">
                        {program.is_self_paced ?
                            "Self-paced program" :
                            program.duration_days ?
                                `${program.duration_days}-day program` :
                                "Flexible duration program"
                        }
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Program Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-700 whitespace-pre-line">
                                {program.description || "No detailed description available for this program."}
                            </p>

                            {program.enrollment?.start_date && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                                    <p className="text-blue-800 font-medium">
                                        You started this program on {new Date(program.enrollment.start_date).toLocaleDateString()}
                                    </p>
                                    {program.enrollment.expected_end_date && (
                                        <p className="text-blue-700 text-sm mt-1">
                                            Expected completion: {new Date(program.enrollment.expected_end_date).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="mt-6">
                        <h2 className="text-2xl font-semibold mb-4">Program Modules</h2>
                        <Suspense fallback={<p>Loading modules...</p>}>
                            <ProgramModulesList programId={programId} />
                        </Suspense>
                    </div>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Your Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center p-4">
                                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-blue-100 text-blue-800 text-2xl font-bold mb-2">
                                    25%
                                </div>
                                <p className="text-sm text-gray-600">
                                    You&apos;ve completed 1 of 4 modules
                                </p>
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Quick Stats</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-gray-50 rounded-md">
                                        <p className="text-xs text-gray-500">Modules Completed</p>
                                        <p className="text-lg font-medium">1/4</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-md">
                                        <p className="text-xs text-gray-500">Time Spent</p>
                                        <p className="text-lg font-medium">45 min</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-md">
                                        <p className="text-xs text-gray-500">Assessments</p>
                                        <p className="text-lg font-medium">1/2</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-md">
                                        <p className="text-xs text-gray-500">Days Active</p>
                                        <p className="text-lg font-medium">3</p>
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