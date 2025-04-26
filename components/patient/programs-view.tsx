"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCategoryPrograms } from "@/lib/actions/patient/programs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { CalendarDays, Clock, BookOpen, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Program } from "@/lib/actions/patient/programs";

interface ProgramsViewProps {
    categoryId: string;
}

export function PatientProgramsView({ categoryId }: ProgramsViewProps) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        async function fetchPrograms() {
            try {
                const response = await getCategoryPrograms(categoryId);

                if (response.success) {
                    setPrograms(response.data || []);
                } else {
                    toast({
                        title: "Error",
                        description: response.error?.message || "Failed to load programs",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Error fetching programs:", error);
                toast({
                    title: "Error",
                    description: "An unexpected error occurred",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        }

        fetchPrograms();
    }, [categoryId, toast]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="h-[300px] animate-pulse">
                        <CardHeader>
                            <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-4 bg-gray-200 rounded-md w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded-md w-5/6 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded-md w-4/5"></div>
                            <div className="mt-6 h-8 bg-gray-200 rounded-md w-1/2 mx-auto"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (programs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Programs Available</CardTitle>
                    <CardDescription>
                        You haven't been enrolled in any programs in your treatment category yet.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-4">
                        Please contact your healthcare provider for more information about available programs.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((program) => {
                const enrollmentStatus = program.enrollment?.status || null;
                let statusBadge = null;

                switch(enrollmentStatus) {
                    case 'in_progress':
                        statusBadge =
                            <Badge className="bg-blue-500">
                                <BookOpen className="mr-1 h-3 w-3" />
                                In Progress
                            </Badge>;
                        break;
                    case 'completed':
                        statusBadge =
                            <Badge className="bg-green-500">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Completed
                            </Badge>;
                        break;
                    case 'assigned':
                        statusBadge =
                            <Badge className="bg-yellow-500">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Assigned
                            </Badge>;
                        break;
                }

                return (
                    <Card key={program.id} className="overflow-hidden flex flex-col">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>{program.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                        {program.is_self_paced ?
                                            "Self-paced program" :
                                            program.duration_days ?
                                                `${program.duration_days}-day program` :
                                                "Flexible duration"
                                        }
                                    </CardDescription>
                                </div>
                                {statusBadge}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                                {program.description || "No description provided."}
                            </p>

                            <div className="flex flex-col gap-2 mt-4">
                                <div className="flex items-center text-sm text-gray-500">
                                    <Clock className="mr-2 h-4 w-4" />
                                    {program.is_self_paced ?
                                        "Complete at your own pace" :
                                        program.duration_days ?
                                            `Approximately ${program.duration_days} days` :
                                            "Duration not specified"
                                    }
                                </div>

                                {program.enrollment?.start_date && (
                                    <div className="flex items-center text-sm text-gray-500">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        Started on {new Date(program.enrollment.start_date).toLocaleDateString()}
                                    </div>
                                )}

                                {enrollmentStatus === 'in_progress' && (
                                    <div className="mt-2">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>Progress</span>
                                            <span>25%</span> {/* This would ideally be dynamic based on module completion */}
                                        </div>
                                        <Progress value={25} className="h-2" />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button asChild className="w-full">
                                <Link href={`/patient/programs/${program.id}`}>
                                    {enrollmentStatus === 'completed' ? 'Review Program' : 'Continue Program'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}