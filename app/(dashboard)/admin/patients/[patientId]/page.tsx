// app/(dashboard)/admin/patients/[patientId]/page.tsx


import { getPatientById } from "@/lib/actions/admin/patient";
import { getPatientCurrentEnrollment } from "@/lib/actions/admin/enrollment";
import { getAllPrograms } from "@/lib/actions/admin/program";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, Mail, Phone, Clock } from "lucide-react";
import Link from "next/link";
import { AssignProgramModal } from "@/components/admin/assign-program-modal";
//import { useRouter } from "next/navigation";

// Properly defining the Patient type to match database schema
interface Patient {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    created_at: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    role: string;
}

interface PatientDetailsProps {
    params: {
        patientId: string;
    };
}

export async function generateMetadata({ params }: PatientDetailsProps): Promise<Metadata> {
    const response = await getPatientById(params.patientId);

    if (!response.success || !response.data) {
        return {
            title: "Patient Details - Not Found",
        };
    }

    const patient = response.data;
    return {
        title: `Patient Details - ${patient.first_name} ${patient.last_name}`,
    };
}

export default async function PatientDetailsPage({ params }: PatientDetailsProps) {
    // Check authorization
    await requireAdmin();

    // Fetch patient data
    const response = await getPatientById(params.patientId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const patient = response.data as Patient;

    // Fetch current enrollment
    const enrollmentResponse = await getPatientCurrentEnrollment(params.patientId);
    const enrollment = enrollmentResponse.success ? enrollmentResponse.data : null;

    // Fetch available programs for assignment
    const programsResponse = await getAllPrograms();
    const programs = programsResponse.success ? programsResponse.data : [];

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/patients" className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to patients
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Patient Information */}
                <div className="md:col-span-2">
                    <Card className="mb-6">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">
                                    {patient.first_name} {patient.last_name}
                                </CardTitle>
                                <CardDescription>
                                    Patient Details
                                </CardDescription>
                            </div>
                            <Badge variant={patient.is_active ? "outline" : "destructive"}>
                                {patient.is_active ? "Active" : "Inactive"}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <div className="flex items-center">
                                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <p>{patient.email}</p>
                                    </div>
                                </div>

                                {patient.phone && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                        <div className="flex items-center">
                                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p>{patient.phone}</p>
                                        </div>
                                    </div>
                                )}

                                {patient.date_of_birth && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p>{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                )}

                                {patient.gender && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Gender</p>
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                                            <p className="capitalize">{patient.gender}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="program">
                        <TabsList>
                            <TabsTrigger value="program">Treatment Program</TabsTrigger>
                            <TabsTrigger value="progress">Progress</TabsTrigger>
                            <TabsTrigger value="history">History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="program" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Treatment Program</CardTitle>
                                    <CardDescription>
                                        Current rehabilitation program enrollment
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {enrollment ? (
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
                                                    programs={programs.map(p => ({id: p.id, title: p.title, description: p.description}))}
                                                    onSuccess={() => window.location.reload()}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <h3 className="text-lg font-medium text-gray-700 mb-2">
                                                No Program Assigned
                                            </h3>
                                            <p className="text-sm text-gray-500 mb-4">
                                                This patient is not currently enrolled in any treatment program.
                                            </p>
                                            <AssignProgramModal
                                                patientId={patient.id}
                                                patientName={`${patient.first_name} ${patient.last_name}`}
                                                programs={programs.map(p => ({id: p.id, title: p.title, description: p.description}))}
                                                onSuccess={() => window.location.reload()}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="progress" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Program Progress</CardTitle>
                                    <CardDescription>
                                        Patient progress through assigned modules and assessments
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {enrollment ? (
                                        <p className="text-center text-muted-foreground py-8">
                                            Progress tracking will be implemented in the next phase.
                                        </p>
                                    ) : (
                                        <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-500">
                                                No program assigned. Assign a program to track progress.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Treatment History</CardTitle>
                                    <CardDescription>
                                        Previous programs and achievements
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-center text-muted-foreground py-8">
                                        History tracking will be implemented in the next phase.
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar */}
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button className="w-full" asChild>
                                <Link href={`/admin/patients/${patient.id}/edit`}>
                                    Edit Patient Details
                                </Link>
                            </Button>

                            {!enrollment && (
                                <AssignProgramModal
                                    patientId={patient.id}
                                    patientName={`${patient.first_name} ${patient.last_name}`}
                                    programs={programs.map(p => ({id: p.id, title: p.title, description: p.description}))}
                                    onSuccess={() => window.location.reload()}
                                />
                            )}

                            <Button variant="outline" className="w-full" asChild>
                                <Link href={`/admin/patients/${patient.id}/notes`}>
                                    Patient Notes
                                </Link>
                            </Button>

                            <Button variant={patient.is_active ? "destructive" : "outline"} className="w-full">
                                {patient.is_active ? "Deactivate Patient" : "Activate Patient"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}