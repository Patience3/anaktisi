// app/(dashboard)/patient/assessments/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPatientCategory } from "@/lib/actions/patient/programs";
import { getPatientAssessments } from "@/lib/actions/patient/assessments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileText } from "lucide-react";
import { AssessmentList } from "@/components/patient/assessment-list";

export const metadata: Metadata = {
    title: "Assessments | Patient Portal",
    description: "Take and review your treatment assessments",
};

export default async function AssessmentsPage() {
    // Get patient's assigned category
    const categoryResponse = await getPatientCategory();

    if (!categoryResponse.success) {
        // Show an error message
        return (
            <div className="container mx-auto py-6">
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {categoryResponse.error?.message || "Failed to load your treatment category"}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // If no category assigned, show message
    if (!categoryResponse.data) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col gap-2 mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
                    <p className="text-muted-foreground">
                        Take and review your assessments
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>No Assessments Available</CardTitle>
                        <CardDescription>
                            You haven't been assigned to a treatment category yet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-amber-50 border border-amber-100 rounded-md p-4 text-amber-800">
                            <div className="flex gap-2 items-start">
                                <AlertCircle className="h-5 w-5 mt-0.5 text-amber-600" />
                                <div>
                                    <p className="font-medium mb-1">Category assignment required</p>
                                    <p className="text-sm">
                                        Your therapist needs to assign you to a treatment category before you can access any assessments.
                                        Please contact your therapist for assistance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Get assessments for the patient's category
    const categoryId = categoryResponse.data.category_id;
    const assessmentsResponse = await getPatientAssessments(categoryId);

    // Handle the case where assessmentsResponse.data might be null
    const availableAssessments = assessmentsResponse.success && assessmentsResponse.data ?
        assessmentsResponse.data.available || [] : [];

    const completedAssessments = assessmentsResponse.success && assessmentsResponse.data ?
        assessmentsResponse.data.completed || [] : [];

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
                <p className="text-muted-foreground">
                    Complete assessments to track your progress
                </p>
            </div>

            <div className="mb-6">
                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader>
                        <CardTitle className="text-blue-800">{categoryResponse.data.category.name}</CardTitle>
                        <CardDescription className="text-blue-700">
                            Assessments for your treatment category
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="available">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="available">Available</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="all">All Assessments</TabsTrigger>
                </TabsList>

                <TabsContent value="available">
                    <Suspense fallback={<AssessmentSkeleton />}>
                        <AssessmentList
                            assessments={availableAssessments}
                            emptyMessage="No available assessments"
                            type="available"
                        />
                    </Suspense>
                </TabsContent>

                <TabsContent value="completed">
                    <Suspense fallback={<AssessmentSkeleton />}>
                        <AssessmentList
                            assessments={completedAssessments}
                            emptyMessage="You haven't completed any assessments yet"
                            type="completed"
                        />
                    </Suspense>
                </TabsContent>

                <TabsContent value="all">
                    <Suspense fallback={<AssessmentSkeleton />}>
                        <AssessmentList
                            assessments={[...availableAssessments, ...completedAssessments]}
                            emptyMessage="No assessments found"
                            type="all"
                        />
                    </Suspense>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AssessmentSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader>
                        <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}