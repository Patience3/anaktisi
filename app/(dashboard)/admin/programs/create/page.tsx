"use client";

import { ProgramForm } from "@/components/admin/program-form";
import { useRouter } from "next/navigation";
import { Program } from "@/lib/actions/admin/program";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateProgramPage() {
    const router = useRouter();

    const handleSuccess = (program: Program) => {
        // Redirect to the program detail page after successful creation
        router.push(`/admin/programs/${program.id}`);
    };

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/admin/programs" className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to programs
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Create New Program</CardTitle>
                    <CardDescription>
                        Create a rehabilitation program for your patients
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ProgramForm onSuccess={handleSuccess} />
                </CardContent>
            </Card>
        </div>
    );
}