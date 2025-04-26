// components/admin/recent-patients-table.tsx
"use server";

import Link from "next/link";
import { getRecentPatients } from "@/lib/actions/admin/dashboard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export async function RecentPatientsTable() {
    const patients = await getRecentPatients(5);

    if (patients.length === 0) {
        return (
            <div className="text-center py-6">
                <p className="text-muted-foreground">No patients available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {patients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-900">
                                {patient.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="font-medium flex items-center gap-2">
                                {patient.name}
                                {!patient.isActive && (
                                    <Badge variant="outline" className="text-red-500 border-red-200 text-xs">
                                        Inactive
                                    </Badge>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground">{patient.email}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {patient.category ? (
                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                                {patient.category}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                                No Category
                            </Badge>
                        )}

                        <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/patients/${patient.id}`} className="flex items-center gap-1">
                                <span className="sr-only md:not-sr-only md:inline-block">View</span>
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            ))}

            <div className="pt-2 text-center">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/admin/patients">View All Patients</Link>
                </Button>
            </div>
        </div>
    );
}