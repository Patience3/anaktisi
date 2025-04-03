"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { updatePatientStatus } from "@/lib/actions/admin/patient";
import { Power, Loader2 } from "lucide-react";

interface TogglePatientStatusButtonProps {
    patientId: string;
    isActive: boolean;
    size?: "default" | "sm" | "lg";
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
}

export function TogglePatientStatusButton({
                                              patientId,
                                              isActive,
                                              size = "sm",
                                              variant = "outline"
                                          }: TogglePatientStatusButtonProps) {
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    async function handleToggleStatus() {
        setIsPending(true);

        try {
            const result = await updatePatientStatus(patientId, !isActive);

            if (result.success) {
                toast({
                    title: isActive ? "Patient Deactivated" : "Patient Activated",
                    description: `The patient is now ${isActive ? "inactive" : "active"}.`,
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "Failed to update patient status",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error updating patient status:", error);
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
            variant={variant}
            size={size}
            onClick={handleToggleStatus}
            disabled={isPending}
            className={isActive ? "" : "text-destructive"}
        >
            {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Power className="mr-2 h-4 w-4" />
            )}
            {isActive ? "Deactivate" : "Activate"}
        </Button>
    );
}