"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { AssignProgramModal } from "@/components/admin/assign-program-modal";

// Define proper types
interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
}

interface Enrollment {
    id: string;
    program_id: string;
    program_title: string;
    start_date: string;
    expected_end_date?: string;
    status: string;
}

interface ProgramInfo {
    id: string;
    title: string;
    description?: string;
}

interface PatientProgramSectionProps {
    patient: Patient;
    enrollment: Enrollment | null;
    programs: ProgramInfo[];
}

export function PatientProgramSection({ patient, enrollment, programs }: PatientProgramSectionProps) {
    const router = useRouter();

    // Ensure programs have required properties
    const safePrograms = programs.map(p => ({
        id: p.id,
        title: p.title || "Untitled Program",
        description: p.description || ""
    }));

    const handleSuccess = () => {
        router.refresh();
    };

    return enrollment ? (
        <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                    {enrollment.program_title}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-700">Status</p>
                        <div className="flex items-center">
                            <Badge className="capitalize">
                                {enrollment.status.replace('_', ' ')}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-medium text-blue-700">Start Date</p>
                        <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-blue-700" />
                            <p>{new Date(enrollment.start_date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {enrollment.expected_end_date && (
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-700">Expected Completion</p>
                            <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2 text-blue-700" />
                                <p>{new Date(enrollment.expected_end_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/programs/${enrollment.program_id}`}>
                            View Program Details
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex justify-end">
                <AssignProgramModal
                    patientId={patient.id}
                    patientName={`${patient.first_name} ${patient.last_name}`}
                    programs={safePrograms}
                    onSuccess={handleSuccess}
                />
            </div>
        </div>
    ) : (
        <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Program Assigned</h3>
            <p className="text-sm text-gray-500 mb-4">
                This patient is not currently enrolled in any treatment program.
            </p>
            <AssignProgramModal
                patientId={patient.id}
                patientName={`${patient.first_name} ${patient.last_name}`}
                programs={safePrograms}
                onSuccess={handleSuccess}
            />
        </div>
    );
}