// app/(dashboard)/admin/patients/[patientId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { getPatientById } from "@/lib/actions/admin/patient";
import { getCategoriesForFilter } from "@/lib/actions/admin/patient";
import { getPatientEnrolledPrograms, getPatientCategory } from "@/lib/actions/admin/patient-programs";
import { requireAdmin } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientCategorySection } from "@/components/admin/patient-category-section";
import { PatientProgramsSection } from "@/components/admin/patient-programs-section";
import { Separator } from "@/components/ui/separator";
import { Metadata } from "next";
import { TogglePatientStatusButton } from "@/components/admin/toggle-patient-status-button";

interface PatientDetailProps {
    params: {
        patientId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: PatientDetailProps): Promise<Metadata> {
    // Make sure params is resolved before using it
    const patientId = params.patientId;
    const patientResponse = await getPatientById(patientId);
    if (!patientResponse.success || !patientResponse.data) {
        return {
            title: "Patient - Not Found",
        };
    }

    const patient = patientResponse.data;
    return {
        title: `Patient - ${patient.first_name} ${patient.last_name}`,
    };
}

export default async function PatientDetailPage({ params }: PatientDetailProps) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        // Redirect to login if not authorized
        redirect("/login");
    }

    const patientId = params.patientId;

    // Fetch patient data
    const patientResponse = await getPatientById(patientId);

    if (!patientResponse.success || !patientResponse.data) {
        notFound();
    }

    const patient = patientResponse.data;

    // Fetch all categories for assignment
    const categoriesResponse = await getCategoriesForFilter();
    const categories = categoriesResponse.success ? categoriesResponse.data || [] : [];

    // Fetch patient's enrolled programs
    const programsResponse = await getPatientEnrolledPrograms(patientId);
    const programs = programsResponse.success ? programsResponse.data || [] : [];

    // Fetch patient's category details
    const categoryResponse = await getPatientCategory(patientId);
    const categoryDetails = categoryResponse.success ? categoryResponse.data : null;

    // Format the date of birth
    const formattedDob = patient.date_of_birth
        ? new Date(patient.date_of_birth).toLocaleDateString()
        : "Not specified";

    const createdAt = new Date(patient.created_at).toLocaleDateString();

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
                {/* Patient Profile Card */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Patient Profile</span>
                            <Badge variant={patient.is_active ? "outline" : "destructive"}>
                                {patient.is_active ? "Active" : "Inactive"}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center space-y-3">
                            <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-800 font-bold text-2xl">
                                    {patient.first_name[0]}{patient.last_name[0]}
                                </span>
                            </div>
                            <h2 className="text-xl font-semibold">
                                {patient.first_name} {patient.last_name}
                            </h2>

                            <TogglePatientStatusButton
                                patientId={patient.id}
                                isActive={patient.is_active}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-start gap-2">
                                <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-sm text-gray-600">{patient.email}</p>
                                </div>
                            </div>

                            {patient.phone && (
                                <div className="flex items-start gap-2">
                                    <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Phone</p>
                                        <p className="text-sm text-gray-600">{patient.phone}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-2">
                                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Date of Birth</p>
                                    <p className="text-sm text-gray-600">{formattedDob}</p>
                                </div>
                            </div>

                            {patient.gender && (
                                <div className="flex items-start gap-2">
                                    <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium">Gender</p>
                                        <p className="text-sm text-gray-600 capitalize">{patient.gender}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-2">
                                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Patient Since</p>
                                    <p className="text-sm text-gray-600">{createdAt}</p>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-center">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/admin/patients/${patient.id}/edit`}>
                                    Edit Patient
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-6">
                    <Tabs defaultValue="treatment" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="treatment">Treatment</TabsTrigger>
                            <TabsTrigger value="progress">Progress</TabsTrigger>
                            <TabsTrigger value="assessments">Assessments</TabsTrigger>
                        </TabsList>

                        <TabsContent value="treatment" className="mt-6 space-y-6">
                            {/* Category Section */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Treatment Category</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <PatientCategorySection
                                        patient={{
                                            id: patient.id,
                                            first_name: patient.first_name,
                                            last_name: patient.last_name,
                                            email: patient.email,
                                            is_active: patient.is_active,
                                            category: patient.category
                                        }}
                                        categories={categories}
                                    />
                                </CardContent>
                            </Card>

                            {/* Programs Section */}
                            <PatientProgramsSection
                                patientId={patient.id}
                                patientName={`${patient.first_name} ${patient.last_name}`}
                                categoryId={categoryDetails?.categoryId}
                                categoryName={categoryDetails?.categoryName}
                                categoryEnrollmentId={categoryDetails?.id ?? undefined}
                                programs={programs}
                            />
                        </TabsContent>

                        <TabsContent value="progress" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Treatment Progress</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-6 text-center">
                                        <p className="text-gray-500">Progress tracking will be available soon.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="assessments" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assessment Results</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-6 text-center">
                                        <p className="text-gray-500">Assessment results will be available soon.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}