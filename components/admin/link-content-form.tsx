"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createLinkContent, getNextContentSequence } from "@/lib/actions/admin/content";
import { LinkContentSchema, ContentItem } from "@/lib/validations";
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
import { Loader2, Link as LinkIcon, ExternalLink, Globe } from "lucide-react";

// Infer the type from the Zod schema
type LinkContentFormValues = z.infer<typeof LinkContentSchema>;

interface LinkContentFormProps {
    moduleId: string;
    onSuccess: (content: ContentItem) => void;
    contentItem?: ContentItem; // For editing, not implemented yet
}

export function LinkContentForm({ moduleId, onSuccess, contentItem }: LinkContentFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingNextSequence, setIsLoadingNextSequence] = useState(!contentItem);
    const [linkPreview, setLinkPreview] = useState<{ title?: string, favicon?: string, domain?: string } | null>(null);

    const isEditMode = !!contentItem;

    // Parse content JSON if in edit mode
    const contentData = isEditMode && contentItem.content_type === 'link'
        ? JSON.parse(contentItem.content)
        : { linkUrl: '', description: '' };

    // Initialize React Hook Form with Zod resolver
    const form = useForm<LinkContentFormValues>({
        resolver: zodResolver(LinkContentSchema),
        defaultValues: {
            moduleId: moduleId,
            title: contentItem?.title || "",
            linkUrl: contentData.linkUrl || "",
            description: contentData.description || "",
            sequenceNumber: contentItem?.sequence_number || 0, // We'll fetch the next sequence if not in edit mode
        },
    });

    // Extract domain and update link preview
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'linkUrl' && value.linkUrl) {
                try {
                    const url = value.linkUrl as string;
                    if (url && url.includes('://')) {
                        const domain = new URL(url).hostname.replace('www.', '');

                        // If we have no title yet, use the domain as a suggested title
                        if (!form.getValues('title')) {
                            form.setValue('title', domain.charAt(0).toUpperCase() + domain.slice(1));
                        }

                        // Update preview
                        setLinkPreview({
                            domain,
                            favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
                        });
                    }
                } catch (e) {
                    // Invalid URL, clear preview
                    setLinkPreview(null);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [form]);

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
        }
    }, [form, isEditMode, moduleId]);

    async function onSubmit(data: LinkContentFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            // Create new link content
            const result = await createLinkContent(data);

            if (result.success && result.data) {
                form.reset(); // Reset form on success
                setLinkPreview(null);
                onSuccess(result.data);
            } else {
                setError(result.error?.message || "Failed to save link");

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
                    name="linkUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link URL</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Globe className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <Input
                                        placeholder="https://example.com"
                                        {...field}
                                        className="pl-10"
                                    />
                                </div>
                            </FormControl>
                            <FormDescription>
                                URL to an external resource (must start with http:// or https://)
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Link Preview */}
                {linkPreview && (
                    <div className="bg-slate-50 p-4 rounded-md border flex items-center gap-3">
                        {linkPreview.favicon && (
                            <img
                                src={linkPreview.favicon}
                                alt="Site favicon"
                                className="w-8 h-8 rounded-sm object-contain"
                                onError={(e) => {
                                    // Hide the image if it fails to load
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        )}
                        <div>
                            <div className="text-sm font-medium">{form.getValues('title') || linkPreview.domain}</div>
                            <div className="text-xs text-muted-foreground">{linkPreview.domain}</div>
                        </div>
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter link title" {...field} />
                            </FormControl>
                            <FormDescription>
                                A clear, descriptive title for this link
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
                            <FormLabel>Link Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Describe what this link contains or why it's relevant..."
                                    className="min-h-[120px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                A description of what this link contains and why it is relevant
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
                            isEditMode ? "Update Link" : "Add Link"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}