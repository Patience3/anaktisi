"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Program, updateProgramStatus } from "@/lib/actions/admin/program";
import { Power, Loader2 } from "lucide-react";

interface ToggleProgramStatusButtonProps {
    program: Program;
}

export function ToggleProgramStatusButton({ program }: ToggleProgramStatusButtonProps) {
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    async function handleToggleStatus() {
        setIsPending(true);

        try {
            const result = await updateProgramStatus(program.id, !program.is_active);

            if (result.success) {
                toast({
                    title: program.is_active ? "Program Deactivated" : "Program Activated",
                    description: `The program is now ${program.is_active ? "inactive" : "active"}.`,
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "Failed to update program status",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error updating program status:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsPending(false);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={isPending}
        >
            {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Power className="mr-2 h-4 w-4" />
            )}
            {program.is_active ? "Deactivate" : "Activate"}
        </Button>
    );
}