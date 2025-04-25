// app/(dashboard)/patient/programs/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import { getPatientCategory } from "@/lib/actions/patient/programs";
import { PatientProgramsView } from "@/components/patient/programs-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export const metadata: Metadata = {
    title: "My Programs | Patient Portal",
    description: "View and access your assigned treatment programs",
};

export default async function PatientProgramsPage() {
    // Fetch the patient's assigned category
    const categoryResponse = await getPatientCategory();

    if (!categoryResponse.success) {
        // Show an error message if we couldn't fetch the category
        return (
            <div className="container mx-auto py-6">
                <Alert variant="destructive" className="mb-6">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {categoryResponse.error?.message || "Failed to load your treatment category"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // If the patient doesn't have an assigned category yet
    if (!categoryResponse.data) {
        return (
            <div className="container mx-auto py-6">
                <h1 className="text-3xl font-bold tracking-tight mb-6">My Programs</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>No Treatment Category Assigned</CardTitle>
                        <CardDescription>
                            You haven't been assigned to a treatment category yet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                        <div className="bg-blue-50 rounded-full p-4 mb-4">
                            <InfoIcon className="h-10 w-10 text-blue-500" />
                        </div>
                        <p className="text-center max-w-md text-muted-foreground mb-4">
                            Your therapist needs to assign you to a treatment category before you can
                            access any programs. Please contact your therapist for more information.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const category = categoryResponse.data;

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">My Programs</h1>
                <p className="text-muted-foreground">
                    View and access your assigned treatment programs
                </p>
            </div>

            <div className="mb-8">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-blue-800 text-2xl">{category.category.name}</CardTitle>
                                <CardDescription className="text-blue-700 mt-2">
                                    Your assigned treatment category
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                Active
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-blue-800">
                            {category.category.description || "No description available for this category."}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Available Programs</h2>
                <Suspense fallback={<ProgramsSkeleton />}>
                    <PatientProgramsView categoryId={category.category_id} />
                </Suspense>
            </div>
        </div>
    );
}

// Skeleton loader for programs
function ProgramsSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="h-[300px] animate-pulse">
                    <CardHeader>
                        <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-4 bg-gray-200 rounded-md w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded-md w-5/6 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded-md w-4/5"></div>
                        <div className="mt-6 h-8 bg-gray-200 rounded-md w-1/2 mx-auto"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}