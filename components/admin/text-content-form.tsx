// components/admin/text-content-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createTextContent, updateTextContent, getNextContentSequence } from "@/lib/actions/admin/content";
import { TextContentSchema, ContentItem } from "@/lib/validations";
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

// Infer the type from the Zod schema
type TextContentFormValues = z.infer<typeof TextContentSchema>;

interface TextContentFormProps {
    moduleId: string;
    onSuccess: (content: ContentItem) => void;
    contentItem?: ContentItem; // For editing, not implemented yet
}

export function TextContentForm({ moduleId, onSuccess, contentItem }: TextContentFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingNextSequence, setIsLoadingNextSequence] = useState(!contentItem);

    const isEditMode = !!contentItem;

    // Initialize React Hook Form with Zod resolver
    const form = useForm<TextContentFormValues>({
        resolver: zodResolver(TextContentSchema),
        defaultValues: {
            moduleId: moduleId,
            title: contentItem?.title || "",
            content: contentItem?.content || "",
            sequenceNumber: contentItem?.sequence_number || 0, // We'll fetch the next sequence if not in edit mode
        },
    });

    // Fetch next sequence number on component mount if creating new content
    useEffect(() => {
        if (!isEditMode) {
            async function fetchNextSequence() {
                try {
                    const result = await getNextContentSequence(moduleId);
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
        } else {
            setIsLoadingNextSequence(false);
        }
    }, [form, isEditMode, moduleId]);

    async function onSubmit(data: TextContentFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            let result;

            if (isEditMode && contentItem) {
                // Update existing content
                result = await updateTextContent(contentItem.id, data);
            } else {
                // Create new text content
                result = await createTextContent(data);
            }

            if (result.success && result.data) {
                if (!isEditMode) {
                    form.reset(); // Reset form on success for creation
                }
                onSuccess(result.data);
            } else {
                setError(result.error?.message || "Failed to save content");

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
                            <FormLabel>Content Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter content title" {...field} />
                            </FormControl>
                            <FormDescription>
                                A clear, descriptive title for this content
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Text Content</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter your content here..."
                                    className="min-h-[300px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                The text content to be displayed to patients
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

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
                                The order of this content in the module
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
                            isEditMode ? "Update Content" : "Create Content"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}