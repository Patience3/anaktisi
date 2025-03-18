import { EditProgramClient } from "./client";
import { getProgramById } from "@/lib/actions/admin/program";
import { ProgramForm } from "@/components/admin/program-form";
import { requireAdmin } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface EditProgramPageProps {
    params: {
        programId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: EditProgramPageProps): Promise<Metadata> {
    const response = await getProgramById(params.programId);

    if (!response.success || !response.data) {
        return {
            title: "Edit Program - Not Found",
        };
    }

    return {
        title: `Edit Program - ${response.data.title}`,
    };
}

export default async function EditProgramPage({ params }: EditProgramPageProps) {
    // Check authorization
    await requireAdmin();

    // Fetch program data
    const response = await getProgramById(params.programId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const program = response.data;

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${program.id}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to program
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Edit Program</CardTitle>
                    <CardDescription>
                        Modify the details of {program.title}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EditProgramClient program={program} />
                </CardContent>
            </Card>
        </div>
    );
}