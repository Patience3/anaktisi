"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createVideoContent, getNextContentSequence } from "@/lib/actions/admin/content";
import { VideoContentSchema, ContentItem } from "@/lib/validations";
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
type VideoContentFormValues = z.infer<typeof VideoContentSchema>;

interface VideoContentFormProps {
    moduleId: string;
    onSuccess: (content: ContentItem) => void;
    contentItem?: ContentItem; // For editing, not implemented yet
}

export function VideoContentForm({ moduleId, onSuccess, contentItem }: VideoContentFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingNextSequence, setIsLoadingNextSequence] = useState(!contentItem);

    const isEditMode = !!contentItem;

    // Parse content JSON if in edit mode
    const contentData = isEditMode && contentItem.content_type === 'video'
        ? JSON.parse(contentItem.content)
        : { videoUrl: '', description: '' };

    // Initialize React Hook Form with Zod resolver
    const form = useForm<VideoContentFormValues>({
        resolver: zodResolver(VideoContentSchema),
        defaultValues: {
            moduleId: moduleId,
            title: contentItem?.title || "",
            videoUrl: contentData.videoUrl || "",
            description: contentData.description || "",
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
                        // @ts-ignore
                        form.setValue("sequenceNumber", result.data);
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
    }, [form, isEditMode, moduleId]);

    async function onSubmit(data: VideoContentFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            // Create new video content
            const result = await createVideoContent(data);

            if (result.success) {
                form.reset(); // Reset form on success
                // Pass the content directly without checking result.data
                onSuccess(result.data as ContentItem);
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
                            <FormLabel>Video Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter video title" {...field} />
                            </FormControl>
                            <FormDescription>
                                A clear, descriptive title for this video
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Video URL</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                URL to the video (e.g., YouTube, Vimeo, or other hosting service)
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
                            <FormLabel>Video Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter a description of the video..."
                                    className="min-h-[150px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                A description of what this video covers
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
                            isEditMode ? "Update Video" : "Add Video"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}