// app/(dashboard)/admin/patients/page.tsx
// Simplified to only handle name search

import { Suspense } from "react";
import { getAllPatients } from "@/lib/actions/admin/patient";
import { requireAdmin } from "@/lib/auth-utils";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { PatientsClient } from "./patients-client";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Patients | Admin Dashboard",
    description: "Manage patient accounts and treatment categories",
};

interface PatientsPageProps {
    searchParams: {
        search?: string;
    };
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
    try {
        // Check authorization
        await requireAdmin();

        // Get search term from URL params
        const searchTerm = searchParams?.search || undefined;

        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
                        <p className="text-muted-foreground">
                            Manage patient accounts and treatment programs
                        </p>
                    </div>
                </div>

                <Separator className="my-6" />

                <Suspense fallback={<TableSkeleton columns={5} rows={10} />}>
                    <PatientsTableContainer
                        searchTerm={searchTerm}
                    />
                </Suspense>
            </div>
        );
    } catch (error) {
        console.error("Error in patients page:", error);
        notFound();
    }
}

// This is a separate async component to handle the data fetching
async function PatientsTableContainer({
                                          searchTerm
                                      }: {
    searchTerm?: string
}) {
    // Fetch patients with filters applied
    const response = await getAllPatients(searchTerm);

    if (!response.success) {
        return (
            <div className="rounded-md bg-destructive/15 p-4">
                <p className="text-sm text-destructive">
                    {response.error?.message || "Failed to load patients"}
                </p>
            </div>
        );
    }

    const patients = response.data || [];

    return (
        <PatientsClient
            patients={patients}
            initialSearch={searchTerm}
        />
    );
}