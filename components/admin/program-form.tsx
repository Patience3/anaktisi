// components/admin/program-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProgram, updateProgram, getAllCategories } from "@/lib/actions/admin/program";
import { CreateProgramSchema } from "@/lib/validations";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Program } from "@/lib/actions/admin/program";
import { Loader2 } from "lucide-react";

// Infer the type from the Zod schema
type ProgramFormValues = z.infer<typeof CreateProgramSchema>;

interface ProgramFormProps {
    program?: Program; // Optional for edit mode
    onSuccess: (program: Program) => void;
}

interface Category {
    id: string;
    name: string;
}

export function ProgramForm({ program, onSuccess }: ProgramFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    const isEditMode = !!program;

    // Initialize React Hook Form with Zod resolver
    const form = useForm<ProgramFormValues>({
        resolver: zodResolver(CreateProgramSchema),
        defaultValues: {
            title: program?.title || "",
            description: program?.description || "",
            categoryId: program?.category_id || "",
            durationDays: program?.duration_days || undefined,
            isSelfPaced: program?.is_self_paced || false,
        },
    });

    // Fetch categories on component mount
    useEffect(() => {
        async function fetchCategories() {
            try {
                const result = await getAllCategories();
                if (result.success && result.data) {
                    setCategories(result.data);
                } else {
                    setError("Failed to load categories");
                }
            } catch (e) {
                setError("An unexpected error occurred while loading categories");
                console.error(e);
            } finally {
                setIsLoadingCategories(false);
            }
        }

        fetchCategories();
    }, []);

    async function onSubmit(data: ProgramFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            // Either create or update based on mode
            const result = isEditMode
                ? await updateProgram(program.id, data)
                : await createProgram(data);

            if (result.success && result.data) {
                form.reset(); // Reset form on success
                onSuccess(result.data);
            } else {
                setError(result.error?.message || "Failed to save program");

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

    // Watch the isSelfPaced field to conditionally render duration input
    const isSelfPaced = form.watch("isSelfPaced");

    if (isLoadingCategories) {
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
                            <FormLabel>Program Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter program title" {...field} />
                            </FormControl>
                            <FormDescription>
                                A clear, descriptive title for the program
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
                                    placeholder="Describe the program and its goals"
                                    className="min-h-[120px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Provide details about what patients will learn and achieve
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {categories.length > 0 ? (
                                        categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            No categories available
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Categorize the program for easier discovery
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isSelfPaced"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Self-paced Program</FormLabel>
                                <FormDescription>
                                    Allow patients to complete this program at their own pace
                                </FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                {!isSelfPaced && (
                    <FormField
                        control={form.control}
                        name="durationDays"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Duration (Days)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="Enter program duration in days"
                                        value={field.value || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? undefined : parseInt(value, 10));
                                        }}
                                        onBlur={field.onBlur}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Recommended number of days to complete this program
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

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
                            isEditMode ? "Update Program" : "Create Program"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}