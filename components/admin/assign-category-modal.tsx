"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { assignPatientToCategory } from "@/lib/actions/admin/patient";
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
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Tag } from "lucide-react";
import { EnrollProgramsModal } from "./enroll-programs-modal";

// Validation schema for category assignment
const AssignCategoryFormSchema = z.object({
    categoryId: z.string().uuid("Please select a valid category"),
});

type FormValues = z.infer<typeof AssignCategoryFormSchema>;

interface CategoryInfo {
    id: string;
    name: string;
    description?: string;
}

interface AssignCategoryModalProps {
    patientId: string;
    patientName: string;
    categories: CategoryInfo[];
    currentCategoryId?: string | null;
    children: React.ReactNode;
    onSuccess?: () => void;
}

export function AssignCategoryModal({
                                        patientId,
                                        patientName,
                                        categories,
                                        currentCategoryId,
                                        children,
                                        onSuccess,
                                    }: AssignCategoryModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showEnrollDialog, setShowEnrollDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Prepare form with default values
    const form = useForm<FormValues>({
        resolver: zodResolver(AssignCategoryFormSchema),
        defaultValues: {
            categoryId: currentCategoryId || "",
        },
    });

    // Handle form submission
    const onSubmit = async (data: FormValues) => {
        setIsLoading(true);

        try {
            const result = await assignPatientToCategory(patientId, data.categoryId);

            if (result.success) {
                // Find selected category for enrollment dialog
                const category = categories.find(c => c.id === data.categoryId);
                if (category) {
                    setSelectedCategory(category);
                }

                // Get the number of programs the patient was enrolled in
                const programsEnrolled = result.data?.programsEnrolled || 0;

                // Show success message
                toast({
                    title: "Category Assigned",
                    description: `${patientName} has been assigned to the selected category.`,
                });

                // Ask if they want to enroll in programs
                if (programsEnrolled === 0) {
                    setShowEnrollDialog(true);
                } else {
                    setIsOpen(false);

                    // Refresh the page data
                    if (onSuccess) {
                        onSuccess();
                    } else {
                        router.refresh();
                    }
                }
            } else {
                toast({
                    title: "Error",
                    description: result.error?.message || "Failed to assign category",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error assigning category:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnrollComplete = () => {
        setShowEnrollDialog(false);
        setIsOpen(false);

        if (onSuccess) {
            onSuccess();
        } else {
            router.refresh();
        }
    };

    const handleCategoryChange = (categoryId: string) => {
        form.setValue("categoryId", categoryId);

        // Update selected category for potential enrollment
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            setSelectedCategory(category);
        } else {
            setSelectedCategory(null);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Assign Treatment Category</DialogTitle>
                        <DialogDescription>
                            Assign {patientName} to a treatment category. This will enable you to enroll the patient in programs within this category.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Treatment Category</FormLabel>
                                        <Select
                                            onValueChange={handleCategoryChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Select the most appropriate treatment category for this patient
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {selectedCategory && selectedCategory.description && (
                                <div className="bg-slate-50 p-3 rounded-md border text-sm text-gray-700">
                                    <div className="flex items-center gap-2 font-medium mb-1">
                                        <Tag className="h-4 w-4 text-blue-600" />
                                        <span>{selectedCategory.name}</span>
                                    </div>
                                    <p>{selectedCategory.description}</p>
                                </div>
                            )}

                            <DialogFooter>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Assigning...
                                        </>
                                    ) : (
                                        "Assign Category"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Enrollment Dialog */}
            {showEnrollDialog && selectedCategory && (
                <EnrollProgramsModal
                    patientId={patientId}
                    patientName={patientName}
                    categoryId={selectedCategory.id}
                    categoryName={selectedCategory.name}
                    onSuccess={handleEnrollComplete}
                >
                    <Button onClick={() => setShowEnrollDialog(false)} className="hidden">
                        Hidden Trigger
                    </Button>
                </EnrollProgramsModal>
            )}
        </>
    );
}