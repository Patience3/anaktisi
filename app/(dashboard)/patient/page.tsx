// app/(dashboard)/patient/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { getPatientCategory, getCategoryPrograms } from "@/lib/actions/patient/programs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";
import {
    BookOpen, ArrowRight, CheckCircle, BarChart3, Calendar, Clock,
    Activity, Heart
} from "lucide-react";
import { PatientDashboardStats } from "@/components/patient/dashboard-stats";

export const metadata: Metadata = {
    title: "Dashboard | Patient Portal",
    description: "Your recovery journey dashboard",
};

export default async function PatientDashboardPage() {
    // Fetch the patient's assigned category
    const categoryResponse = await getPatientCategory();

    // Basic user info
    const authUser = await getAuthUserSafe();
    const profile = authUser ? await getUserProfile(authUser.id) : null;

    const firstName = profile?.first_name || "Patient";

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Welcome back, {firstName}</h1>
                <p className="text-muted-foreground">
                    Here's an overview of your treatment progress
                </p>
            </div>

            {/* Dashboard stats */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <PatientDashboardStats />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Treatment category */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Treatment Category</CardTitle>
                        <CardDescription>
                            View your assigned treatment category
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {categoryResponse.success && categoryResponse.data ? (
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                <h3 className="font-semibold text-blue-800 text-lg">
                                    {categoryResponse.data.category.name}
                                </h3>
                                <p className="text-blue-700 mt-2 text-sm">
                                    {categoryResponse.data.category.description ||
                                        "No description available for this category."}
                                </p>
                            </div>
                        ) : (
                            <div className="p-6 text-center">
                                <p className="text-muted-foreground">
                                    You haven't been assigned to a treatment category yet.
                                </p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/patient/programs">
                                View Programs
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Recent activity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>
                            Your recent treatment activity
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium">Started a new module</p>
                                    <p className="text-sm text-muted-foreground">
                                        Introduction to Anxiety Management
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Yesterday at 2:30 PM
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="bg-green-100 p-2 rounded-full">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium">Completed assessment</p>
                                    <p className="text-sm text-muted-foreground">
                                        Anxiety Severity Assessment
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        2 days ago at 11:45 AM
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick actions */}
            <h2 className="text-2xl font-semibold mt-8 mb-4">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="bg-blue-100 mx-auto w-12 h-12 flex items-center justify-center rounded-full mb-4">
                                <BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="font-medium mb-2">Continue Learning</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Resume your current module
                            </p>
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link href="/patient/programs">Go to Programs</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="bg-purple-100 mx-auto w-12 h-12 flex items-center justify-center rounded-full mb-4">
                                <Activity className="h-6 w-6 text-purple-600" />
                            </div>
                            <h3 className="font-medium mb-2">Track Progress</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                View your recovery progress
                            </p>
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link href="/patient/progress">View Progress</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="bg-green-100 mx-auto w-12 h-12 flex items-center justify-center rounded-full mb-4">
                                <Heart className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="font-medium mb-2">Mood Tracking</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Log your daily mood
                            </p>
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link href="/patient/mood">Track Mood</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="bg-amber-100 mx-auto w-12 h-12 flex items-center justify-center rounded-full mb-4">
                                <BarChart3 className="h-6 w-6 text-amber-600" />
                            </div>
                            <h3 className="font-medium mb-2">Assessments</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Take or review assessments
                            </p>
                            <Button variant="outline" size="sm" className="w-full" asChild>
                                <Link href="/patient/assessments">View Assessments</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}