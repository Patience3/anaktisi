// components/admin/delete-assessment-button.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { deleteAssessment } from "@/lib/actions/admin/assessment";
import { Trash2, Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteAssessmentButtonProps {
    assessmentId: string;
    contentItemId: string;
    moduleId: string;
    programId: string;
    redirectAfterDelete?: boolean;
}

export function DeleteAssessmentButton({
                                           assessmentId,
                                           contentItemId,
                                           moduleId,
                                           programId,
                                           redirectAfterDelete = true
                                       }: DeleteAssessmentButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    async function handleDelete() {
        setIsPending(true);

        try {
            const result = await deleteAssessment(assessmentId, contentItemId, moduleId);

            if (result.success) {
                toast({
                    title: "Assessment Deleted",
                    description: "The assessment has been successfully deleted.",
                });
                setIsOpen(false);

                if (redirectAfterDelete) {
                    router.push(`/admin/programs/${programId}/modules/${moduleId}`);
                }

                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "Failed to delete assessment",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting assessment:", error);
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
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete this assessment and all its questions.
                        This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Delete Assessment"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}