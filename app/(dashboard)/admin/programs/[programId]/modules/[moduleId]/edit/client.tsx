"use client";

import { ModuleForm } from "@/components/admin/module-form";
import { Module } from "@/lib/actions/admin/module";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface EditModuleClientProps {
    module: Module;
    programId: string;
}

export function EditModuleClient({ module, programId }: EditModuleClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (updatedModule: Module) => {
        toast({
            title: "Module Updated",
            description: "The module has been successfully updated.",
        });

        // Redirect back to module detail page
        router.push(`/admin/programs/${programId}/modules/${module.id}`);
    };

    return (
        <ModuleForm module={module} programId={programId} onSuccess={handleSuccess} />
    );
}