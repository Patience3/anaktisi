"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updatePatient } from "@/lib/actions/admin/patient";
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

// Patient edit schema - ensure this matches the one in lib/actions/admin/patient.ts
const EditPatientSchema = z.object({
    patientId: z.string().uuid("Invalid patient ID"),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Valid email is required"),
    isActive: z.boolean().default(true),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    phone: z.string().optional(),
});

// Type inference for the form
type EditPatientFormValues = z.infer<typeof EditPatientSchema>;

// Patient type
interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    date_of_birth?: string | null;
    gender?: string | null;
    phone?: string | null;
    role: string;
}

interface EditPatientFormProps {
    patient: Patient;
    onSuccess?: () => void;
}

export function EditPatientForm({ patient, onSuccess }: EditPatientFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Initialize form with patient data, handling null values correctly
    const form = useForm<EditPatientFormValues>({
        resolver: zodResolver(EditPatientSchema),
        defaultValues: {
            patientId: patient.id,
            firstName: patient.first_name,
            lastName: patient.last_name,
            email: patient.email,
            isActive: patient.is_active,
            dateOfBirth: patient.date_of_birth || "",
            gender: patient.gender || "",
            phone: patient.phone || "",
        },
    });

    async function onSubmit(data: EditPatientFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            const result = await updatePatient(data);

            if (result.success) {
                // Show success message
                setError(null);

                // Refresh the data by calling onSuccess or refreshing the router
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.refresh();
                }

                // Optionally redirect back to patient detail page
                router.push(`/admin/patients/${patient.id}`);
            } else {
                setError(result.error?.message || "Failed to update patient");

                // Handle validation errors from server
                if (result.error?.details) {
                    // Set field errors from server response
                    Object.entries(result.error.details).forEach(([field, messages]) => {
                        if (field in form.formState.errors && Array.isArray(messages) && messages.length > 0) {
                            form.setError(field as keyof EditPatientFormValues, {
                                type: "server",
                                message: messages[0],
                            });
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error updating patient:", e);
            setError("An unexpected error occurred");
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="John" {...field} />
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
                                    value={field.value || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value || undefined);
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                Optional: Patient's date of birth
                            </FormDescription>
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
                                value={field.value || ""}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">Not specified</SelectItem>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                Optional: Patient's gender
                            </FormDescription>
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
                                    placeholder="+1 (555) 123-4567"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value || undefined);
                                    }}
                                />
                            </FormControl>
                            <FormDescription>
                                Optional: Patient's contact phone number
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Active Status</FormLabel>
                                <FormDescription>
                                    {field.value
                                        ? "Patient is active and can access the system"
                                        : "Patient is inactive and cannot log in"}
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Hidden field for patientId */}
                <input type="hidden" {...form.register("patientId")} />

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading || !form.formState.isDirty}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Update Patient"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}