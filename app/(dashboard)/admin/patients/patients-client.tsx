// app/(dashboard)/admin/patients/patients-client.tsx
// Simplified version with only name search

"use client";

import { useState, useEffect } from "react";
import { Patient } from "@/lib/actions/admin/patient";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { columns } from "@/components/admin/patient-columns";
import { PatientTable } from "@/components/admin/patient-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { UserPlus, Search, X } from "lucide-react";
import { CreatePatientDialog } from "@/components/admin/create-patient-dialog";

interface PatientsClientProps {
    patients: Patient[];
    initialSearch?: string;
}

export function PatientsClient({
                                   patients,
                                   initialSearch = ""
                               }: PatientsClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(initialSearch || "");

    // Debounce search input to avoid too many URL updates
    const debouncedSearch = useDebounce(search, 500);

    // Update URL when search changes (debounced)
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (debouncedSearch) {
            params.set("search", debouncedSearch);
        } else {
            params.delete("search");
        }

        // Update the URL with the new search params
        router.replace(`${pathname}?${params.toString()}`);
    }, [debouncedSearch, router, pathname, searchParams]);

    // Clear search
    const handleClearSearch = () => {
        setSearch("");
        router.replace(pathname);
    };

    const hasSearch = !!search;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search patients..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {hasSearch && (
                        <Button variant="ghost" onClick={handleClearSearch} size="sm">
                            <X className="h-4 w-4 mr-2" />
                            Clear
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <CreatePatientDialog>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            New Patient
                        </Button>
                    </CreatePatientDialog>
                </div>
            </div>

            <div>
                <PatientTable
                    columns={columns}
                    data={patients}
                />
            </div>

            {patients.length === 0 && (
                <div className="text-center py-10">
                    <h3 className="text-lg font-medium">No patients found</h3>
                    <p className="text-muted-foreground mt-1">
                        {hasSearch
                            ? "Try adjusting your search filter or create a new patient."
                            : "Get started by creating your first patient."}
                    </p>
                </div>
            )}
        </div>
    );
}