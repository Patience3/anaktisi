"use client";

import { ModuleForm } from "@/components/admin/module-form";
import { useRouter } from "next/navigation";
import { Module } from "@/lib/actions/admin/module";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { useParams } from "next/navigation";
//interface CreateModulePageProps {
    //params: {
      //  programId: string;
  //  };
export default function CreateModulePage() {


//export default function CreateModulePage({ params }: CreateModulePageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const params = useParams() as { programId: string };

    const handleSuccess = (module: Module) => {
        toast({
            title: "Module Created",
            description: "The module has been successfully created.",
        });

        // Redirect to the module detail page after successful creation
        router.push(`/admin/programs/${params.programId}/modules/${module.id}`);
    };

    return (
        <div className="container mx-auto max-w-3xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to modules
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Create New Module</CardTitle>
                    <CardDescription>
                        Create a learning module with content for patients
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ModuleForm
                        programId={params.programId}
                        onSuccess={handleSuccess}
                    />
                </CardContent>
            </Card>
        </div>
    );
}