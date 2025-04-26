"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPatientAccount } from "@/lib/actions/auth";
import { CreatePatientSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getCategoriesForFilter } from "@/lib/actions/admin/patient";

// Extend the CreatePatientSchema to include optional categoryId
const ExtendedCreatePatientSchema = CreatePatientSchema.extend({
    categoryId: z.string().uuid("Valid category ID is required").optional(),
});

// Infer the type from the Zod schema
type PatientFormValues = z.infer<typeof ExtendedCreatePatientSchema>;

interface PatientFormProps {
    onSuccess: (tempPassword: string) => void;
}

interface Category {
    id: string;
    name: string;
    description?: string;
}

export function PatientForm({ onSuccess }: PatientFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    // Initialize React Hook Form with Zod resolver
    const form = useForm<PatientFormValues>({
        resolver: zodResolver(ExtendedCreatePatientSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            dateOfBirth: "",
            gender: "",
            phone: "",
            categoryId: undefined,
        },
    });

    // Fetch categories when component mounts
    useEffect(() => {
        async function fetchCategories() {
            setIsLoadingCategories(true);
            try {
                const result = await getCategoriesForFilter();

                if (result.success && result.data) {
                    setCategories(result.data);
                } else {
                    console.error("Failed to fetch categories:", result.error);
                }
            } catch (e) {
                console.error("Error fetching categories:", e);
            } finally {
                setIsLoadingCategories(false);
            }
        }

        fetchCategories();
    }, []);

    async function onSubmit(data: PatientFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            const result = await createPatientAccount(data);

            if (result.success && result.data) {
                form.reset(); // Reset form on success
                onSuccess(result.data.tempPassword);
            } else {
                setError(result.error?.message || "Failed to create patient");
                console.log(result.error?.message.toString());

                // Handle validation errors from server
                if (result.error?.details) {
                    // Set field errors from server response
                    Object.entries(result.error.details).forEach(([field, messages]) => {
                        form.setError(field as never, {
                            type: "server",
                            message: messages[0]
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

    return (
        <Form {...form}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="patient@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John"  {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                                <Input
                                    type="date"
                                    {...field}
                                    // Convert empty string to undefined for optional fields
                                    onChange={(e) => field.onChange(e.target.value || undefined)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                                <Input
                                    type="tel"
                                    placeholder="+233549034077"
                                    {...field}
                                    // Convert empty string to undefined for optional fields
                                    onChange={(e) => field.onChange(e.target.value || undefined)}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Treatment Category (Optional)</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a treatment category (optional)" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {isLoadingCategories ? (
                                        <SelectItem value="loading" disabled>
                                            Loading categories...
                                        </SelectItem>
                                    ) : categories.length > 0 ? (
                                        <>
                                            <SelectItem value="none">No category</SelectItem>
                                            {categories.map(category => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </>
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            No categories available
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Optionally assign a treatment category at creation
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading || form.formState.isSubmitting}
                    >
                        {isLoading ? "Creating..." : "Create Patient"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}