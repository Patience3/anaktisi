// app/(dashboard)/admin/patients/page.tsx
import { getAllPatients } from "@/lib/actions/admin/patient";
import { requireAdmin } from "@/lib/auth-utils";
import { PatientTable } from "@/components/admin/patient-table";
import { columns } from "@/components/admin/patient-columns";
import { CreatePatientDialog } from "@/components/admin/create-patient-dialog";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/shared/table-skeleton";

export default async function PatientsPage() {
    // Check authorization
    await requireAdmin();

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Patients</h1>
                <CreatePatientDialog>
                    <Button>Add New Patient</Button>
                </CreatePatientDialog>
            </div>

            <Suspense fallback={<TableSkeleton columns={columns.length} rows={5} />}>
                <PatientTableContainer  />
            </Suspense>
        </div>
    );
}

// This is a separate async component to handle the data fetching while allowing the page UI to load immediately
// Rather than doing everything in 1 component (PatientsPage), this approach fetches data at the component level, allowing the page shell to render immediately while the table shows a loading state
async function PatientTableContainer() {
    // Fetch all patients
    const response = await getAllPatients();

    const patients = response.success && response.data ? response.data : [];

    return (
        <div className="">
            <PatientTable columns={columns} data={patients} />
        </div>
    );
}