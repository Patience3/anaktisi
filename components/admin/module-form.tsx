"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createModule, updateModule, getNextSequenceNumber, Module } from "@/lib/actions/admin/module";
import { CreateModuleSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Infer the type from the Zod schema
type ModuleFormValues = z.infer<typeof CreateModuleSchema>;

interface ModuleFormProps {
    module?: Module; // Optional for edit mode
    programId: string;
    onSuccess: (module: Module) => void;
}

export function ModuleForm({ module, programId, onSuccess }: ModuleFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingNextSequence, setIsLoadingNextSequence] = useState(!module);

    const isEditMode = !!module;

    // Initialize React Hook Form with Zod resolver
    const form = useForm<ModuleFormValues>({
        resolver: zodResolver(CreateModuleSchema),
        defaultValues: {
            title: module?.title || "",
            description: module?.description || "",
            programId: module?.program_id || programId,
            sequenceNumber: module?.sequence_number || 0, // We'll fetch the next sequence if not in edit mode
            estimatedMinutes: module?.estimated_minutes || undefined,
            isRequired: module?.is_required ?? true,
        },
    });

    // Fetch next sequence number on component mount if creating a new module
    useEffect(() => {
        if (!isEditMode) {
            async function fetchNextSequence() {
                try {
                    const result = await getNextSequenceNumber(programId);
                    if (result.success) {
                        form.setValue("sequenceNumber", result.data as number);
                    }
                } catch (e) {
                    console.error("Failed to get next sequence number:", e);
                    // Default to 1 if we can't fetch
                    form.setValue("sequenceNumber", 1);
                } finally {
                    setIsLoadingNextSequence(false);
                }
            }

            fetchNextSequence();
        }
    }, [form, isEditMode, programId]);

    async function onSubmit(data: ModuleFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            // Either create or update based on mode
            const result = isEditMode
                ? await updateModule(module.id, data)
                : await createModule(data);

            if (result.success && result.data) {
                form.reset(); // Reset form on success
                onSuccess(result.data);
            } else {
                setError(result.error?.message || "Failed to save module");

                // Handle validation errors from server
                if (result.error?.details) {
                    // Set field errors from server response
                    Object.entries(result.error.details).forEach(([field, messages]) => {
                        form.setError(field as never, {
                            type: "server",
                            message: messages[0],
                        });
                    });
                }
            }
        } catch (e) {
            setError("An unexpected error occurred");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoadingNextSequence) {
        return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <Form {...form}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Module Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter module title" {...field} />
                            </FormControl>
                            <FormDescription>
                                A clear, descriptive title for the module
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe what this module covers and its learning objectives"
                                    className="min-h-[120px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                A description of what patients will learn in this module
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="sequenceNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sequence Number</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="Module order"
                                        value={field.value || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? undefined : parseInt(value, 10));
                                        }}
                                        onBlur={field.onBlur}
                                    />
                                </FormControl>
                                <FormDescription>
                                    The order of this module in the program
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="estimatedMinutes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estimated Duration (minutes)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="Estimated time in minutes"
                                        value={field.value || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? undefined : parseInt(value, 10));
                                        }}
                                        onBlur={field.onBlur}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Approximate time to complete this module
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="isRequired"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Required Module</FormLabel>
                                <FormDescription>
                                    Patients must complete this module to progress in the program
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                {/* Hidden field for programId */}
                <input type="hidden" {...form.register("programId")} />

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading || form.formState.isSubmitting}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isEditMode ? "Updating..." : "Creating..."}
                            </>
                        ) : (
                            isEditMode ? "Update Module" : "Create Module"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}