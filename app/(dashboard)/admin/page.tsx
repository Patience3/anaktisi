// app/(dashboard)/admin/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { BarChart3, Clock } from "lucide-react";
import { AdminDashboardStats } from "@/components/admin/dashboard-stats";
//import { RecentPatientsTable } from "@/components/admin/recent-patients-table";
import { EnrollmentChart } from "@/components/admin/enrollment-chart";
import { AdminCategoryStats } from "@/components/admin/category-stats";

export const metadata: Metadata = {
    title: "Admin Dashboard | Anaktisi",
    description: "Administrative overview of the rehabilitation platform",
};

export default async function AdminDashboardPage() {
    // Ensure user is admin
    await requireAdmin();

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of patient recovery, program enrollments, and platform activity
                </p>
            </div>

            {/* Dashboard Stats */}
            <Suspense fallback={<div className="grid gap-4 md:grid-cols-4 animate-pulse">
                {Array(4).fill(null).map((_, i) => (
                    <Card key={i} className="h-32">
                        <CardHeader className="p-4 pb-0">
                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="h-6 bg-slate-200 rounded w-1/3 mb-2"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>}>
                <AdminDashboardStats />
            </Suspense>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Patient Enrollment Activity</CardTitle>
                        <CardDescription>
                            New enrollments over time across program categories
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<div className="h-80 bg-slate-100 rounded animate-pulse flex items-center justify-center">
                            <BarChart3 className="h-10 w-10 text-slate-300" />
                        </div>}>
                            <EnrollmentChart />
                        </Suspense>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Category Distribution</CardTitle>
                        <CardDescription>
                            Patients by treatment category
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<div className="h-80 bg-slate-100 rounded animate-pulse"></div>}>
                            <AdminCategoryStats />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Patient Activity</CardTitle>
                        <CardDescription>
                            Recently added or active patients
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<div className="animate-pulse">
                            {Array(5).fill(null).map((_, i) => (
                                <div key={i} className="flex py-4 border-b border-gray-100">
                                    <div className="h-10 w-10 rounded-full bg-slate-200 mr-3"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>}>

                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}