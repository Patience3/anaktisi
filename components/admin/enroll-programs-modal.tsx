"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getProgramsByCategory, enrollPatientInPrograms } from "@/lib/actions/admin/enrollment";
import { useToast } from "@/components/ui/use-toast";
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
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

interface Program {
    id: string;
    title: string;
    description: string | null;
    duration_days: number | null;
    is_self_paced: boolean;
    created_at: string;
    category_id: string;
}

interface EnrollProgramsModalProps {
    patientId: string;
    patientName: string;
    categoryId: string;
    categoryName: string;
    categoryEnrollmentId?: string;
    children: React.ReactNode;
    onSuccess?: () => void;
}

export function EnrollProgramsModal({
                                        patientId,
                                        patientName,
                                        categoryId,
                                        categoryName,
                                        categoryEnrollmentId,
                                        children,
                                        onSuccess,
                                    }: EnrollProgramsModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingPrograms, setIsFetchingPrograms] = useState(false);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    // Fetch programs when the dialog opens
    useEffect(() => {
        if (isOpen) {
            fetchPrograms();
        }
    }, [isOpen, categoryId]);

    const fetchPrograms = async () => {
        if (!categoryId) return;

        setIsFetchingPrograms(true);
        try {
            const result = await getProgramsByCategory(categoryId);
            if (result.success && result.data) {
                setPrograms(result.data);
                // Default to selecting all active programs
                const activeIds = new Set(result.data.map(program => program.id));
                setSelectedPrograms(activeIds);
                setSelectAll(true);
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "Failed to fetch programs",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error fetching programs:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred while fetching programs",
                variant: "destructive",
            });
        } finally {
            setIsFetchingPrograms(false);
        }
    };

    const handleCheckboxChange = (programId: string, checked: boolean) => {
        const newSelectedPrograms = new Set(selectedPrograms);

        if (checked) {
            newSelectedPrograms.add(programId);
        } else {
            newSelectedPrograms.delete(programId);
        }

        setSelectedPrograms(newSelectedPrograms);

        // Update selectAll state
        setSelectAll(newSelectedPrograms.size === programs.length);
    };

    const handleSelectAllChange = (checked: boolean) => {
        setSelectAll(checked);

        if (checked) {
            // Select all programs
            setSelectedPrograms(new Set(programs.map(program => program.id)));
        } else {
            // Deselect all programs
            setSelectedPrograms(new Set());
        }
    };

    const handleEnroll = async () => {
        if (selectedPrograms.size === 0) {
            toast({
                title: "No Programs Selected",
                description: "Please select at least one program to enroll the patient.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const programIds = Array.from(selectedPrograms);
            const result = await enrollPatientInPrograms(patientId, programIds, categoryId, categoryEnrollmentId);

            if (result.success) {
                toast({
                    title: "Enrollment Successful",
                    description: `${patientName} has been enrolled in ${programIds.length} program(s).`,
                });
                setIsOpen(false);

                // Refresh the page data
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.refresh();
                }
            } else {
                toast({
                    title: "Enrollment Failed",
                    description: result.error?.message || "Failed to enroll in programs",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error enrolling patient:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred during enrollment",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Enroll in Programs</DialogTitle>
                    <DialogDescription>
                        Select programs from the {categoryName} category to enroll {patientName}.
                    </DialogDescription>
                </DialogHeader>

                {isFetchingPrograms ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : programs.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-muted-foreground">No active programs found in this category.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-2 py-4">
                            <Checkbox
                                id="select-all"
                                checked={selectAll}
                                onCheckedChange={handleSelectAllChange}
                            />
                            <Label htmlFor="select-all" className="font-medium">
                                Select All Programs
                            </Label>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto pr-2">
                            <div className="space-y-4">
                                {programs.map((program) => (
                                    <Card key={program.id} className="overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-start">
                                                <Checkbox
                                                    id={`program-${program.id}`}
                                                    checked={selectedPrograms.has(program.id)}
                                                    onCheckedChange={(checked) =>
                                                        handleCheckboxChange(program.id, checked as boolean)
                                                    }
                                                    className="mt-1 mr-3"
                                                />
                                                <div className="flex-1">
                                                    <CardTitle className="text-base">
                                                        <Label
                                                            htmlFor={`program-${program.id}`}
                                                            className="cursor-pointer"
                                                        >
                                                            {program.title}
                                                        </Label>
                                                    </CardTitle>
                                                    <CardDescription className="text-xs mt-1">
                                                        {program.is_self_paced
                                                            ? "Self-paced"
                                                            : program.duration_days
                                                                ? `${program.duration_days} days`
                                                                : "Flexible duration"}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {program.description || "No description available"}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                <DialogFooter className="flex justify-between mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleEnroll}
                        disabled={isLoading || selectedPrograms.size === 0}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enrolling...
                            </>
                        ) : (
                            `Enroll in ${selectedPrograms.size} Program${selectedPrograms.size !== 1 ? 's' : ''}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}