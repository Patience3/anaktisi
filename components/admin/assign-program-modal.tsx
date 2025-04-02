"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { assignPatientToProgram, getPatientCurrentEnrollment } from "@/lib/actions/admin/enrollment";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";

// Schema for program assignment
const AssignProgramSchema = z.object({
    programId: z.string().uuid("Please select a program"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
});

interface ProgramInfo {
    id: string;
    title: string;
    description?: string;
}

interface AssignProgramModalProps {
    patientId: string;
    patientName: string;
    programs: ProgramInfo[];
    onSuccess: () => void;
}

export function AssignProgramModal({ patientId, patientName, programs, onSuccess }: AssignProgramModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingEnrollment, setIsLoadingEnrollment] = useState(false);
    const [currentEnrollment, setCurrentEnrollment] = useState<any>(null);
    const [showWarning, setShowWarning] = useState(false);

    const form = useForm<z.infer<typeof AssignProgramSchema>>({
        resolver: zodResolver(AssignProgramSchema),
        defaultValues: {
            startDate: new Date().toISOString().split('T')[0],
        },
    });

    useEffect(() => {
        if (isOpen) {
            // Check if patient already has a program assignment
            const fetchEnrollment = async () => {
                setIsLoadingEnrollment(true);
                try {
                    const result = await getPatientCurrentEnrollment(patientId);
                    if (result.success && result.data) {
                        setCurrentEnrollment(result.data);
                    }
                } catch (error) {
                    console.error("Error fetching enrollment:", error);
                } finally {
                    setIsLoadingEnrollment(false);
                }
            };

            fetchEnrollment();
        }
    }, [isOpen, patientId]);

    const onSubmit = async (data: z.infer<typeof AssignProgramSchema>) => {
        // If patient is already enrolled in a program, show warning
        if (currentEnrollment) {
            setShowWarning(true);
            return;
        }

        await processAssignment(data);
    };

    const processAssignment = async (data: z.infer<typeof AssignProgramSchema>) => {
        setIsLoading(true);

        try {
            const result = await assignPatientToProgram({
                patientId,
                programId: data.programId,
                startDate: data.startDate,
            });

            if (result.success) {
                setIsOpen(false);
                onSuccess();
            } else {
                form.setError("root", {
                    message: result.error?.message || "Failed to assign program"
                });
            }
        } catch (error) {
            console.error("Error assigning program:", error);
            form.setError("root", {
                message: "An unexpected error occurred"
            });
        } finally {
            setIsLoading(false);
            setShowWarning(false);
        }
    };

    const handleConfirmReassignment = () => {
        const data = form.getValues();
        processAssignment(data);
    };

    // Get the selected program title
    const selectedProgramTitle = form.watch("programId")
        ? programs.find(p => p.id === form.watch("programId"))?.title
        : "";

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button>Assign to Program</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign {patientName} to a Treatment Program</DialogTitle>
                        <DialogDescription>
                            Select a program and start date to enroll the patient.
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingEnrollment ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : currentEnrollment ? (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                <div>
                                    <p className="font-medium">Patient is already enrolled</p>
                                    <p className="text-sm text-muted-foreground">
                                        {patientName} is currently enrolled in "{currentEnrollment.program_title}"
                                        (started on {new Date(currentEnrollment.start_date).toLocaleDateString()}).
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Changing programs will reset their progress.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="programId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Treatment Program</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a program" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {programs.map(program => (
                                                    <SelectItem key={program.id} value={program.id}>
                                                        {program.title}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Choose a program suitable for the patient's needs
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            When the patient should begin this program
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {form.formState.errors.root && (
                                <div className="text-sm font-medium text-destructive">
                                    {form.formState.errors.root.message}
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : currentEnrollment ? (
                                        "Change Program"
                                    ) : (
                                        "Assign Program"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Warning dialog when reassigning */}
            <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Program Change</AlertDialogTitle>
                        <AlertDialogDescription>
                            <p className="mb-2">
                                You are about to change {patientName} s program from "{currentEnrollment?.program_title}"
                                to "{selectedProgramTitle}".
                            </p>
                            <p className="mb-2 font-medium text-destructive">
                                This will reset all progress and assessment results for the current program.
                            </p>
                            <p>Are you sure you want to continue?</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleConfirmReassignment}
                        >
                            Yes, Change Program
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}