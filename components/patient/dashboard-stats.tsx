"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle, Clock, Calendar } from "lucide-react";

export function PatientDashboardStats() {
    const [stats, setStats] = useState({
        activePrograms: 0,
        completedModules: 0,
        hoursEngaged: 0,
        daysActive: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This would typically fetch from an API
        // For now, we'll simulate some stats
        setStats({
            activePrograms: 1,
            completedModules: 3,
            hoursEngaged: 8,
            daysActive: 7
        });
        setLoading(false);
    }, []);

    return (
        <>
            <Card className={loading ? "animate-pulse" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{loading ? "-" : stats.activePrograms}</div>
                    <p className="text-xs text-muted-foreground">Program{stats.activePrograms !== 1 ? "s" : ""} in progress</p>
                </CardContent>
            </Card>

            <Card className={loading ? "animate-pulse" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Modules</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{loading ? "-" : stats.completedModules}</div>
                    <p className="text-xs text-muted-foreground">Across all programs</p>
                </CardContent>
            </Card>

            <Card className={loading ? "animate-pulse" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Time Engaged</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{loading ? "-" : stats.hoursEngaged} hrs</div>
                    <p className="text-xs text-muted-foreground">Total learning time</p>
                </CardContent>
            </Card>
        </>
    );
}