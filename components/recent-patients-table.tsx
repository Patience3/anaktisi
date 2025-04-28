// components/admin/recent-patients-table.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecentPatients } from "@/lib/actions/admin/dashboard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, User, UserCheck, UserX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentPatient {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    category: string | null;
}

export function RecentPatientsTable() {
    const [patients, setPatients] = useState<RecentPatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setIsLoading(true);
                const response = await getRecentPatients(5);

                if (response.success) {
                    setPatients(response.data || []);
                } else {
                    setError(response.error?.message || "Failed to load recent patients");
                }
            } catch (err) {
                console.error("Error fetching recent patients:", err);
                setError("Failed to load recent patients");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPatients();
    }, []);

    if (isLoading) {
        return (
            <div className="animate-pulse">
                {Array(5).fill(null).map((_, i) => (
                    <div key={i} className="flex py-4 border-b border-gray-100">
                        <div className="h-10 w-10 rounded-full bg-slate-200 mr-3"></div>
                        <div className="flex-1">
                            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-4 text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    if (patients.length === 0) {
        return (
            <div className="text-center py-8">
                <User className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-muted-foreground">No patients found</p>
            </div>
        );
    }

    // Get initials from name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {patients.map((patient) => (
                    <TableRow key={patient.id}>
                        <TableCell className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                    {getInitials(patient.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium text-sm leading-none">{patient.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{patient.email}</p>
                            </div>
                        </TableCell>
                        <TableCell>
                            {patient.category ? (
                                <Badge variant="outline" className="bg-slate-50">
                                    {patient.category}
                                </Badge>
                            ) : (
                                <span className="text-xs text-muted-foreground">Unassigned</span>
                            )}
                        </TableCell>
                        <TableCell>
                            {patient.isActive ? (
                                <div className="flex items-center">
                                    <UserCheck className="h-4 w-4 text-green-500 mr-1" />
                                    <span className="text-xs">Active</span>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <UserX className="h-4 w-4 text-red-500 mr-1" />
                                    <span className="text-xs">Inactive</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center text-xs text-muted-foreground">
                                <CalendarClock className="h-3 w-3 mr-1" />
                                <span>{formatDistanceToNow(new Date(patient.createdAt), { addSuffix: true })}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={`/admin/patients/${patient.id}`}>
                                    View
                                </Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}