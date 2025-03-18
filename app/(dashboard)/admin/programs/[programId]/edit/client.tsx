"use client";

import { ProgramForm } from "@/components/admin/program-form";
import { Program } from "@/lib/actions/admin/program";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface EditProgramClientProps {
    program: Program;
}

export function EditProgramClient({ program }: EditProgramClientProps) {
    const router = useRouter();
    const { toast } = useToast();

    const handleSuccess = (updatedProgram: Program) => {
        toast({
            title: "Program Updated",
            description: "The program has been successfully updated.",
        });

        // Redirect back to program detail page
        router.push(`/admin/programs/${program.id}`);
    };

    return (
        <ProgramForm program={program} onSuccess={handleSuccess} />
    );
}