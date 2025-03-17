// components/admin/create-patient-dialog.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/components/admin/patient-form";

interface CreatePatientDialogProps {
    children: React.ReactNode;
}

export function CreatePatientDialog({ children }: CreatePatientDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [success, setSuccess] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const onSuccess = (password: string) => {
        setSuccess(true);
        setTempPassword(password);
    };

    const handleClose = () => {
        setOpen(false);

        // If we created a patient, refresh the page data after closing
        if (success) {
            router.refresh();

            // Reset the dialog state after a short delay
            setTimeout(() => {
                setSuccess(false);
                setTempPassword(null);
            }, 300);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {success ? "Patient Created Successfully" : "Create New Patient"}
                    </DialogTitle>
                </DialogHeader>

                {success && tempPassword ? (
                    <>
                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                                <p className="font-bold">Temporary Password:</p>
                                <p className="font-mono mt-1 p-2 bg-white border rounded break-all">
                                    {tempPassword}
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Please securely share this password with the patient. They will be
                                    prompted to change it on first login.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleClose}>Done</Button>
                        </div>
                    </>
                ) : (
                    <PatientForm onSuccess={onSuccess} />
                )}
            </DialogContent>
        </Dialog>
    );
}