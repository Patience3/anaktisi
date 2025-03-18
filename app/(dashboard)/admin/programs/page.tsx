// app/(dashboard)/admin/programs/page.tsx
import { getAllPrograms } from "@/lib/actions/admin/program";
import { requireAdmin } from "@/lib/auth-utils";
import { ProgramTable } from "@/components/admin/program-table";
import { columns } from "@/components/admin/program-columns";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default async function ProgramsPage() {
    // Check authorization
    await requireAdmin();

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Programs</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage rehabilitation programs for patients
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/programs/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Program
                    </Link>
                </Button>
            </div>

            <Suspense fallback={<TableSkeleton columns={6} rows={5} />}>
                <ProgramTableContainer />
            </Suspense>
        </div>
    );
}

// This is a separate async component to handle the data fetching
async function ProgramTableContainer() {
    // Fetch all programs
    const response = await getAllPrograms();

    const programs = response.success && response.data ? response.data : [];

    return (
        <div>
            <ProgramTable columns={columns} data={programs} />
        </div>
    );
}