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
import { MoreHorizontal, Edit, Eye } from "lucide-react";
import Link from "next/link";

// Define the patient type with the properties we'll display in the table
export type Patient = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  role: string;
  program?: {
    id: string;
    title: string;
    status: string;
  } | null;
};

export const columns: ColumnDef<Patient>[] = [
  // Name column
  {
    accessorFn: (row) => `${row.first_name} ${row.last_name}`,
    header: "Name",
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

  // Program column
  {
    accessorKey: "program",
    header: "Program",
    cell: ({ row }) => {
      const patient = row.original;
      return patient.program ? (
          <div>
            <div className="font-medium">{patient.program.title}</div>
            <Badge variant="outline" className="capitalize">
              {patient.program.status.replace('_', ' ')}
            </Badge>
          </div>
      ) : (
          <Badge variant="secondary">No Program</Badge>
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