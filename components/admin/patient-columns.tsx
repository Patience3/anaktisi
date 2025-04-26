// components/admin/patient-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Eye, UserCog, Power } from "lucide-react";
import Link from "next/link";
import { Patient } from "@/lib/actions/admin/patient";
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { updatePatientStatus } from "@/lib/actions/admin/patient";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export const columns: ColumnDef<Patient>[] = [
    {
        accessorKey: "name",
        header: "Patient",
        cell: ({ row }) => {
            const patient = row.original;
            const initials = patient.first_name[0] + patient.last_name[0];

            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-900">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{patient.first_name} {patient.last_name}</div>
                        <div className="text-xs text-muted-foreground">{patient.email}</div>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "category",
        header: "Treatment Category",
        cell: ({ row }) => {
            const category = row.original.category;

            return category ? (
                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                    {category.name}
                </Badge>
            ) : (
                <Badge variant="outline" className="text-muted-foreground">
                    No Category
                </Badge>
            );
        },
    },
    {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => {
            const timestamp = row.getValue("created_at") as string;
            const date = new Date(timestamp);
            return <div className="text-sm">{format(date, 'MMM d, yyyy')}</div>;
        },
    },
    {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
            const isActive = row.getValue("is_active") as boolean;

            return (
                <Badge variant={isActive ? "outline" : "destructive"}>
                    {isActive ? "Active" : "Inactive"}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const patient = row.original;
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const [isPending, setIsPending] = useState(false);
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const { toast } = useToast();
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const router = useRouter();

            const handleStatusToggle = async () => {
                try {
                    setIsPending(true);
                    const result = await updatePatientStatus(patient.id, !patient.is_active);

                    if (result.success) {
                        toast({
                            title: "Status Updated",
                            description: `Patient is now ${patient.is_active ? "inactive" : "active"}.`,
                        });
                        router.refresh();
                    } else {
                        toast({
                            title: "Error",
                            description: result.error?.message || "Failed to update status",
                            variant: "destructive",
                        });
                    }
                } catch (error) {
                    toast({
                        title: "Error",
                        description: "An unexpected error occurred",
                        variant: "destructive",
                    });
                } finally {
                    setIsPending(false);
                }
            };

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/patients/${patient.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/patients/${patient.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Patient
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleStatusToggle}
                            disabled={isPending}
                        >
                            <Power className="mr-2 h-4 w-4" />
                            {patient.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];