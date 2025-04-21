// components/admin/patient-form.tsx
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
import { getAllPrograms } from "@/lib/actions/admin/program";

// Extend the CreatePatientSchema to include optional programId
const ExtendedCreatePatientSchema = CreatePatientSchema.extend({
    programId: z.string().uuid("Valid program ID is required").optional(),
});

// Infer the type from the Zod schema
type PatientFormValues = z.infer<typeof ExtendedCreatePatientSchema>;

interface PatientFormProps {
    onSuccess: (tempPassword: string) => void;
}

interface Program {
    id: string;
    title: string;
}

export function PatientForm({ onSuccess }: PatientFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);

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
            programId: undefined,
        },
    });

    // Fetch programs when component mounts
    useEffect(() => {
        async function fetchPrograms() {
            setIsLoadingPrograms(true);
            try {
                const result = await getAllPrograms();

                if (result.success && result.data) {
                    setPrograms(result.data.map(p => ({
                        id: p.id,
                        title: p.title
                    })));
                } else {
                    console.error("Failed to fetch programs:", result.error);
                }
            } catch (e) {
                console.error("Error fetching programs:", e);
            } finally {
                setIsLoadingPrograms(false);
            }
        }

        fetchPrograms();
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
                    name="programId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Initial Program (Optional)</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a program (optional)" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {isLoadingPrograms ? (
                                        <SelectItem value="loading" disabled>
                                            Loading programs...
                                        </SelectItem>
                                    ) : programs.length > 0 ? (
                                        <>
                                            <SelectItem value="none">No program</SelectItem>
                                            {programs.map(program => (
                                                <SelectItem key={program.id} value={program.id}>
                                                    {program.title}
                                                </SelectItem>
                                            ))}
                                        </>
                                    ) : (
                                        <SelectItem value="none" disabled>
                                            No programs available
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Optionally assign a treatment program at creation
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