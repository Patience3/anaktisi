// components/admin/program-columns.tsx
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
import { MoreHorizontal, Edit, Eye, Trash2, Power } from "lucide-react";
import Link from "next/link";
import { Program } from "@/lib/actions/admin/program";
import { updateProgramStatus, deleteProgram } from "@/lib/actions/admin/program";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export const columns: ColumnDef<Program>[] = [
    // Title column
    {
        accessorKey: "title",
        header: "Program",
        cell: ({ row }) => {
            const program = row.original;
            return (
                <div>
                    <div className="font-medium">{program.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                        {program.description}
                    </div>
                </div>
            );
        },
    },

    // Category column
    {
        accessorKey: "category_name",
        header: "Category",
        cell: ({ row }) => {
            return (
                <Badge variant="outline" className="font-normal">
                    {row.getValue("category_name") || "Uncategorized"}
                </Badge>
            );
        },
    },

    // Duration column
    {
        accessorKey: "duration_days",
        header: "Duration",
        cell: ({ row }) => {
            const program = row.original;
            if (program.is_self_paced) {
                return <span className="text-sm">Self-paced</span>;
            }
            const duration = program.duration_days;
            return (
                <span className="text-sm">
          {duration ? `${duration} days` : "Not specified"}
        </span>
            );
        },
    },

    // Status column
    {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => {
            const status = !!row.getValue("is_active");
            return (
                <Badge variant={status ? "outline" : "destructive"}>
                    {status ? "Active" : "Inactive"}
                </Badge>
            );
        },
    },

    // Created date column
    {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => {
            const created = new Date(row.getValue("created_at"));
            return <div className="text-sm">{created.toLocaleDateString()}</div>;
        },
    },

    // Actions column
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const program = row.original;
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const [isPending, setIsPending] = useState(false);
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const { toast } = useToast();
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const router = useRouter();

            // Handle program status toggle
            const handleStatusToggle = async () => {
                try {
                    setIsPending(true);
                    const result = await updateProgramStatus(program.id, !program.is_active);

                    if (result.success) {
                        toast({
                            title: "Status Updated",
                            description: `Program is now ${program.is_active ? "inactive" : "active"}.`,
                        });
                        router.refresh();
                    } else {
                        toast({
                            title: "Error",
                            description: result.error?.message || "Failed to update status",
                            variant: "destructive",
                        });
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

            // Handle program deletion
            const handleDelete = async () => {
                if (!window.confirm(`Are you sure you want to delete "${program.title}"?`)) {
                    return;
                }

                try {
                    setIsPending(true);
                    const result = await deleteProgram(program.id);

                    if (result.success) {
                        toast({
                            title: "Program Deleted",
                            description: "Program has been successfully deleted.",
                        });
                        router.refresh();
                    } else {
                        toast({
                            title: "Error",
                            description: result.error?.message || "Failed to delete program",
                            variant: "destructive",
                        });
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                            <Link href={`/admin/programs/${program.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/admin/programs/${program.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleStatusToggle} disabled={isPending}>
                            <Power className="mr-2 h-4 w-4" />
                            {program.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={handleDelete}
                            disabled={isPending}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];