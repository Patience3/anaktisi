"use client";

import { useState, useEffect } from "react";
import { Patient } from "@/lib/actions/admin/patient";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { columns } from "@/components/admin/patient-columns";
import { PatientTable } from "@/components/admin/patient-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { UserPlus, Search, Filter, X, Tag } from "lucide-react";
import Link from "next/link";
import { CreatePatientDialog } from "@/components/admin/create-patient-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PatientsClientProps {
    patients: Patient[];
    availableCategories: Array<{id: string, name: string}>;
    initialSearch?: string;
    initialCategoryFilter?: string;
}

export function PatientsClient({
                                   patients,
                                   availableCategories,
                                   initialSearch = "",
                                   initialCategoryFilter = ""
                               }: PatientsClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(initialSearch || "");
    const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter || "");

    // Debounce search input to avoid too many URL updates
    const debouncedSearch = useDebounce(search, 500);

    // Update URL when filters change (debounced)
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (debouncedSearch) {
            params.set("search", debouncedSearch);
        } else {
            params.delete("search");
        }

        if (categoryFilter) {
            params.set("category", categoryFilter);
        } else {
            params.delete("category");
        }

        // Update the URL with the new search params
        router.replace(`${pathname}?${params.toString()}`);
    }, [debouncedSearch, categoryFilter, router, pathname, searchParams]);

    // Clear all filters
    const handleClearFilters = () => {
        setSearch("");
        setCategoryFilter("");
        router.replace(pathname);
    };

    const hasFilters = !!search || !!categoryFilter;

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
                    <Select
                        value={categoryFilter}
                        onValueChange={setCategoryFilter}
                    >
                        <SelectTrigger className="w-[220px]">
                            <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                <SelectValue placeholder="Filter by category" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {availableCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasFilters && (
                        <Button variant="ghost" onClick={handleClearFilters} size="sm">
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
                        {hasFilters
                            ? "Try adjusting your search filters or create a new patient."
                            : "Get started by creating your first patient."}
                    </p>
                </div>
            )}
        </div>
    );
}