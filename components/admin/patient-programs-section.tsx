"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnrollProgramsModal } from "@/components/admin/enroll-programs-modal";
import {
    ArrowRight,
    Calendar,
    CheckCircle,
    AlertCircle,
    BookOpen,
    Clock,
    ListPlus
} from "lucide-react";
import Link from "next/link";

interface PatientProgram {
    id: string;
    title: string;
    description: string | null;
    duration_days: number | null;
    is_self_paced: boolean;
    status: 'assigned' | 'in_progress' | 'completed' | 'dropped';
    start_date: string;
    expected_end_date?: string | null;
    completed_date?: string | null;
    enrollment_id: string;
}

interface PatientProgramsSectionProps {
    patientId: string;
    patientName: string;
    categoryId?: string | null;
    categoryName?: string | null;
    categoryEnrollmentId?: string;
    programs: PatientProgram[];
}

export function PatientProgramsSection({
                                           patientId,
                                           patientName,
                                           categoryId,
                                           categoryName,
                                           categoryEnrollmentId,
                                           programs,
                                       }: PatientProgramsSectionProps) {
    const router = useRouter();

    const handleSuccess = () => {
        // Force a refresh to get the latest data
        router.refresh();
    };

    if (!categoryId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Programs</CardTitle>
                    <CardDescription>
                        No treatment category assigned
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">
                        Assign a treatment category first to enroll in programs.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (programs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Programs</CardTitle>
                    <CardDescription>
                        No programs enrolled
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4">
                        <p className="text-muted-foreground mb-4">
                            {patientName} is not enrolled in any programs yet.
                        </p>

                        <EnrollProgramsModal
                            patientId={patientId}
                            patientName={patientName}
                            categoryId={categoryId}
                            categoryName={categoryName || ""}
                            categoryEnrollmentId={categoryEnrollmentId}
                            onSuccess={handleSuccess}
                        >
                            <Button className="flex items-center gap-2">
                                <ListPlus className="h-4 w-4" />
                                Enroll in Programs
                            </Button>
                        </EnrollProgramsModal>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Programs ({programs.length})</CardTitle>
                    <CardDescription>
                        Enrolled treatment programs
                    </CardDescription>
                </div>

                <EnrollProgramsModal
                    patientId={patientId}
                    patientName={patientName}
                    categoryId={categoryId}
                    categoryName={categoryName || ""}
                    categoryEnrollmentId={categoryEnrollmentId}
                    onSuccess={handleSuccess}
                >
                    <Button size="sm" className="flex items-center gap-2">
                        <ListPlus className="h-4 w-4" />
                        Enroll More
                    </Button>
                </EnrollProgramsModal>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {programs.map((program) => {
                        let statusBadge = null;

                        switch (program.status) {
                            case 'in_progress':
                                statusBadge = (
                                    <Badge className="bg-blue-500">
                                        <BookOpen className="mr-1 h-3 w-3" />
                                        In Progress
                                    </Badge>
                                );
                                break;
                            case 'completed':
                                statusBadge = (
                                    <Badge className="bg-green-500">
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        Completed
                                    </Badge>
                                );
                                break;
                            case 'assigned':
                                statusBadge = (
                                    <Badge className="bg-amber-500">
                                        <AlertCircle className="mr-1 h-3 w-3" />
                                        Assigned
                                    </Badge>
                                );
                                break;
                            case 'dropped':
                                statusBadge = (
                                    <Badge className="bg-red-500">
                                        <AlertCircle className="mr-1 h-3 w-3" />
                                        Dropped
                                    </Badge>
                                );
                                break;
                        }

                        return (
                            <div key={program.id} className="p-4 border rounded-lg flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-medium text-lg">{program.title}</h3>
                                    {statusBadge}
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {program.description || "No description available"}
                                </p>

                                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        <span>Started: {new Date(program.start_date).toLocaleDateString()}</span>
                                    </div>

                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {program.is_self_paced
                                                ? "Self-paced"
                                                : program.duration_days
                                                    ? `${program.duration_days} days`
                                                    : "No duration set"}
                                        </span>
                                    </div>

                                    {program.expected_end_date && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>Expected completion: {new Date(program.expected_end_date).toLocaleDateString()}</span>
                                        </div>
                                    )}

                                    {program.completed_date && (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Completed: {new Date(program.completed_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 flex justify-end">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/programs/${program.id}`} className="flex items-center gap-1">
                                            View Program
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}