// components/admin/assessment-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createAssessmentContent, updateAssessment, getNextContentSequence } from "@/lib/actions/admin/assessment";
import { AssessmentSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

// Define interfaces for the assessment data
interface AssessmentData {
    id: string;
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number | null;
    content_item?: {
        id: string;
        sequence_number: number;
        content: string;
    };
}

interface ContentData {
    description: string;
    instructions: string;
}

// Infer the type from the Zod schema
type AssessmentFormValues = z.infer<typeof AssessmentSchema>;

interface AssessmentFormProps {
    moduleId: string;
    onSuccess: (result: { contentItemId: string, assessmentId: string }) => void;
    assessment?: AssessmentData;
}

export function AssessmentForm({ moduleId, onSuccess, assessment }: AssessmentFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingNextSequence, setIsLoadingNextSequence] = useState(!assessment);

    const isEditMode = !!assessment;

    // Parse content JSON if in edit mode
    let initialInstructions = "";
    if (isEditMode && assessment.content_item) {
        try {
            const contentData = JSON.parse(assessment.content_item.content) as ContentData;
            initialInstructions = contentData.instructions || "";
        } catch (e) {
            console.error("Failed to parse content JSON:", e);
        }
    }

    // Initialize React Hook Form with Zod resolver
    const form = useForm<AssessmentFormValues>({
        resolver: zodResolver(AssessmentSchema),
        defaultValues: {
            moduleId: moduleId,
            title: assessment?.title || "",
            description: assessment?.description || "",
            instructions: initialInstructions || "",
            passingScore: assessment?.passing_score || 70,
            timeLimitMinutes: assessment?.time_limit_minutes || undefined,
            sequenceNumber: assessment?.content_item?.sequence_number || 0,
        },
    });

    // Fetch next sequence number on component mount if creating new assessment
    useEffect(() => {
        if (!isEditMode) {
            async function fetchNextSequence() {
                try {
                    const result = await getNextContentSequence(moduleId);
                    if (result.success && result.data !== undefined) {
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
        } else {
            setIsLoadingNextSequence(false);
        }
    }, [form, isEditMode, moduleId]);

    async function onSubmit(data: AssessmentFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            let result;

            if (isEditMode && assessment) {
                // Update existing assessment
                result = await updateAssessment(assessment.id, data);
            } else {
                // Create new assessment
                result = await createAssessmentContent(data);
            }

            if (result.success && result.data) {
                if (!isEditMode) {
                    form.reset(); // Reset form on success for creation
                }
                onSuccess(result.data);
            } else {
                setError(result.error?.message || "Failed to save assessment");

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
                            <FormLabel>Assessment Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter assessment title" {...field} />
                            </FormControl>
                            <FormDescription>
                                A clear, descriptive title for this assessment
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
                                    placeholder="Describe the purpose and goals of this assessment..."
                                    className="min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                A description of what this assessment covers and its objectives
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="instructions"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Instructions</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Provide instructions for taking this assessment..."
                                    className="min-h-[150px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Detailed instructions for patients taking this assessment
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="passingScore"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Passing Score (%)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={100}
                                        placeholder="e.g., 70"
                                        value={field.value || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? undefined : parseInt(value, 10));
                                        }}
                                        onBlur={field.onBlur}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Minimum percentage required to pass
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="timeLimitMinutes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Time Limit (minutes)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="Leave blank for no time limit"
                                        value={field.value || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? undefined : parseInt(value, 10));
                                        }}
                                        onBlur={field.onBlur}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Optional time limit in minutes
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

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
                                    placeholder="Content order"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value === "" ? undefined : parseInt(value, 10));
                                    }}
                                    onBlur={field.onBlur}
                                />
                            </FormControl>
                            <FormDescription>
                                The order of this assessment in the module
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Hidden field for moduleId */}
                <input type="hidden" {...form.register("moduleId")} />

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
                            isEditMode ? "Update Assessment" : "Create Assessment"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}