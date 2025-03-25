import { getProgramById } from "@/lib/actions/admin/program";
import { getAllModules } from "@/lib/actions/admin/module";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, PlusCircle, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ModulesList } from "@/components/admin/modules-list";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Suspense } from "react";

interface ModulesPageProps {
    params: {
        programId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: ModulesPageProps): Promise<Metadata> {
    const response = await getProgramById(params.programId);

    if (!response.success || !response.data) {
        return {
            title: "Program Modules - Not Found",
        };
    }

    return {
        title: `Modules - ${response.data.title}`,
    };
}

export default async function ModulesPage({ params }: ModulesPageProps) {
    // Check authorization
    await requireAdmin();

    // Fetch program data to display program title
    const programResponse = await getProgramById(params.programId);

    // Handle not found
    if (!programResponse.success || !programResponse.data) {
        notFound();
    }

    const program = programResponse.data;

    return (
        <div className="container mx-auto">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${program.id}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to program
                    </Link>
                </Button>
            </div>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{program.title}</h1>
                    <p className="text-muted-foreground mt-1">Manage learning modules for this program</p>
                </div>
                <Button asChild>
                    <Link href={`/admin/programs/${program.id}/modules/create`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Module
                    </Link>
                </Button>
            </div>

            <Suspense fallback={<TableSkeleton columns={4} rows={3} />}>
                <ModulesListContainer programId={params.programId} />
            </Suspense>
        </div>
    );
}

async function ModulesListContainer({ programId }: { programId: string }) {
    // Fetch modules data
    const modulesResponse = await getAllModules(programId);

    const modules = modulesResponse.success && modulesResponse.data ? modulesResponse.data : [];

    if (modules.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 border rounded-lg bg-white">
                <div className="bg-slate-100 rounded-full p-4 mb-4">
                    <ClipboardList className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold">No modules created yet</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2 mb-6">
                    Start building your program by creating your first learning module.
                    Modules help organize content in a structured sequence.
                </p>
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules/create`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create First Module
                    </Link>
                </Button>
            </div>
        );
    }

    return <ModulesList modules={modules} programId={programId} />;
}