import { notFound, redirect } from "next/navigation";
import { getPatientById } from "@/lib/actions/admin/patient";
import { requireAdmin } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EditPatientForm } from "@/components/admin/edit-patient-form";
import { Metadata } from "next";

interface EditPatientPageProps {
    params: {
        patientId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditPatientPageProps): Promise<Metadata> {
    const patientId=params.patientId;
    const patientResponse = await getPatientById(patientId);

    if (!patientResponse.success || !patientResponse.data) {
        return {
            title: "Edit Patient - Not Found",
        };
    }

    const patient = patientResponse.data;
    return {
        title: `Edit Patient - ${patient.first_name} ${patient.last_name}`,
    };
}

export default async function EditPatientPage({ params }: EditPatientPageProps) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        // Redirect to login if not authorized
        redirect("/login");
    }

    // Fetch patient data
    const patientId=params.patientId;
    const patientResponse = await getPatientById(patientId);

    if (!patientResponse.success || !patientResponse.data) {
        notFound();
    }

    const patient = patientResponse.data;

    return (
        <div className="container mx-auto max-w-2xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/patients/${params.patientId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to patient
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Edit Patient</CardTitle>
                    <CardDescription>
                        Update information for {patient.first_name} {patient.last_name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EditPatientForm
                        patient={patient}
                    />
                </CardContent>
            </Card>
        </div>
    );
}