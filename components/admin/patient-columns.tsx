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
import { MoreHorizontal, Edit, Eye, Power, Tag } from "lucide-react";
import Link from "next/link";
import { Patient } from "@/lib/actions/admin/patient";
import { TogglePatientStatusButton } from "./toggle-patient-status-button";

export const columns: ColumnDef<Patient>[] = [
    // Name column
    {
        accessorFn: (row) => `${row.first_name} ${row.last_name}`,
        header: "Name",
        id: "name",
        cell: ({ row }) => {
            const patient = row.original;
            return (
                <div>
                    <div className="font-medium">
                        {patient.first_name} {patient.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {patient.email}
                    </div>
                </div>
            );
        },
    },

    // Category column
    {
        accessorKey: "category",
        header: "Treatment Category",
        cell: ({ row }) => {
            const patient = row.original;
            return patient.category ? (
                <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-blue-600" />
                    <div className="font-medium">{patient.category.name}</div>
                </div>
            ) : (
                <Badge variant="secondary">Uncategorized</Badge>
            );
        },
    },

    // Status column
    {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
            const isActive = Boolean(row.getValue("is_active"));
            return (
                <div className="flex flex-col items-start gap-2">
                    <Badge variant={isActive ? "outline" : "destructive"}>
                        {isActive ? "Active" : "Inactive"}
                    </Badge>
                    <TogglePatientStatusButton
                        patientId={row.original.id}
                        isActive={isActive}
                        size="sm"
                        variant="ghost"
                    />
                </div>
            );
        },
    },

    // Created date column
    {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => {
            const created = new Date(row.getValue("created_at"));
            return <div>{created.toLocaleDateString()}</div>;
        },
    },

    // Actions column
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const patient = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/patients/${patient.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/patients/${patient.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(patient.id)}
                            className="text-muted-foreground"
                        >
                            Copy ID
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];