// components/admin/dashboard-stats.tsx
"use server";

import { getDashboardStats } from "@/lib/actions/admin/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound, Activity, BookOpen, BarChart } from "lucide-react";

export async function AdminDashboardStats() {
    // Fetch dashboard statistics
    const stats = await getDashboardStats();

    const statsCards = [
        {
            title: "Total Patients",
            value: stats.totalPatients,
            description: `${stats.activePatients} active`,
            icon: UsersRound,
            color: "text-blue-500",
            bgColor: "bg-blue-100"
        },
        {
            title: "Active Programs",
            value: stats.activePrograms,
            description: `${stats.totalModules} modules`,
            icon: BookOpen,
            color: "text-green-500",
            bgColor: "bg-green-100"
        },
        {
            title: "Enrollments",
            value: stats.totalEnrollments,
            description: `${stats.completedEnrollments} completed`,
            icon: Activity,
            color: "text-purple-500",
            bgColor: "bg-purple-100"
        },
        {
            title: "Assessment Completion",
            value: `${stats.assessmentCompletionRate}%`,
            description: `${stats.completedAssessments} assessments`,
            icon: BarChart,
            color: "text-amber-500",
            bgColor: "bg-amber-100"
        }
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((card, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {card.title}
                        </CardTitle>
                        <div className={`${card.bgColor} p-2 rounded-full`}>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{card.value}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {card.description}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}