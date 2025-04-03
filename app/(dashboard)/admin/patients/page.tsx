// app/(dashboard)/admin/patients/page.tsx
import { Suspense } from "react";
import { getAllPatients, getCategoriesForFilter } from "@/lib/actions/admin/patient";
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
        category?: string;
    };
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
    try {
        // Check authorization
        await requireAdmin();

        // Get search term and category filter from URL params
        const searchTerm = searchParams.search || undefined;
        const categoryId = searchParams.category || undefined;

        // Fetch available categories for the filter dropdown
        const categoriesResponse = await getCategoriesForFilter();

        if (!categoriesResponse.success) {
            throw new Error(categoriesResponse.error?.message || "Failed to load categories");
        }

        return (
            <div className="container mx-auto py-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
                        <p className="text-muted-foreground">
                            Manage patient accounts and treatment categories
                        </p>
                    </div>
                </div>

                <Separator className="my-6" />

                <Suspense fallback={<TableSkeleton columns={5} rows={10} />}>
                    <PatientsTableContainer
                        searchTerm={searchTerm}
                        categoryId={categoryId}
                        availableCategories={categoriesResponse.data || []}
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
                                          searchTerm,
                                          categoryId,
                                          availableCategories
                                      }: {
    searchTerm?: string,
    categoryId?: string,
    availableCategories: Array<{id: string, name: string}>
}) {
    // Fetch patients with filters applied
    const response = await getAllPatients();

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
            availableCategories={availableCategories}
            initialSearch={searchTerm}
            initialCategoryFilter={categoryId}
        />
    );
}