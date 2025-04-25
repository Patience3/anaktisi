// components/patient/program-modules-list.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProgramModules, updateModuleProgress } from "@/lib/actions/patient/programs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Clock, CheckCircle, Lock, ArrowRight, BookOpen, AlertCircle } from "lucide-react";

interface ProgramModulesListProps {
    programId: string;
}

export function ProgramModulesList({ programId }: ProgramModulesListProps) {
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchModules() {
            try {
                const response = await getProgramModules(programId);

                if (response.success) {
                    setModules(response.data || []);
                } else {
                    toast({
                        title: "Error",
                        description: response.error?.message || "Failed to load modules",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Error fetching modules:", error);
                toast({
                    title: "Error",
                    description: "An unexpected error occurred",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        }

        fetchModules();
    }, [programId, toast]);

    // Function to start a module
    async function handleStartModule(moduleId: string) {
        setUpdating(moduleId);

        try {
            const response = await updateModuleProgress(moduleId, 'in_progress');

            if (response.success) {
                // Update local state
                setModules(prev =>
                    prev.map(module =>
                        module.id === moduleId
                            ? {...module, progress: {...module.progress, status: 'in_progress'}}
                            : module
                    )
                );

                // Redirect to module
                window.location.href = `/patient/programs/${programId}/modules/${moduleId}`;
            } else {
                toast({
                    title: "Error",
                    description: response.error?.message || "Failed to start module",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error starting module:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setUpdating(null);
        }
    }

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <div className="h-6 bg-gray-200 rounded-md w-1/2 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded-md w-1/3"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-4 bg-gray-200 rounded-md w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (modules.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Modules Available</CardTitle>
                    <CardDescription>
                        This program doesn't have any learning modules yet.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-4">
                        Please check back later or contact your therapist for more information.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Sort modules by sequence number
    const sortedModules = [...modules].sort((a, b) => a.sequence_number - b.sequence_number);

    // Find the first incomplete module (for unlocking logic)
    const firstIncompleteIndex = sortedModules.findIndex(
        module => !module.progress || module.progress.status !== 'completed'
    );

    return (
        <div className="space-y-4">
            {sortedModules.map((module, index) => {
                const moduleStatus = module.progress?.status || 'not_started';
                const isLocked = module.is_required && index > firstIncompleteIndex && firstIncompleteIndex !== -1;
                const isPending = updating === module.id;

                let statusBadge;
                let statusIcon;

                switch(moduleStatus) {
                    case 'not_started':
                        statusBadge = <Badge variant="outline">Not Started</Badge>;
                        statusIcon = <BookOpen className="h-5 w-5 text-gray-400" />;
                        break;
                    case 'in_progress':
                        statusBadge = <Badge className="bg-blue-500">In Progress</Badge>;
                        statusIcon = <BookOpen className="h-5 w-5 text-blue-500" />;
                        break;
                    case 'completed':
                        statusBadge = <Badge className="bg-green-500">Completed</Badge>;
                        statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
                        break;
                }

                if (isLocked) {
                    statusBadge = <Badge variant="outline">Locked</Badge>;
                    statusIcon = <Lock className="h-5 w-5 text-gray-400" />;
                }

                return (
                    <Card key={module.id} className={isLocked ? "opacity-70" : ""}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        {statusIcon}
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">
                                            {index + 1}. {module.title}
                                        </CardTitle>
                                        {module.estimated_minutes && (
                                            <CardDescription className="mt-1 flex items-center">
                                                <Clock className="mr-1 h-3 w-3" />
                                                Approximately {module.estimated_minutes} minutes
                                            </CardDescription>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    {statusBadge}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                            <p className="text-sm text-gray-600">
                                {module.description || "No description provided for this module."}
                            </p>

                            {moduleStatus === 'in_progress' && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span>Module Progress</span>
                                        <span>In progress</span>
                                    </div>
                                    <Progress value={33} className="h-2" />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            {isLocked ? (
                                <div className="w-full flex items-center justify-center gap-2 p-2 bg-gray-50 rounded-md text-sm text-gray-500">
                                    <Lock className="h-4 w-4" />
                                    Complete previous modules first
                                </div>
                            ) : moduleStatus === 'completed' ? (
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/patient/programs/${programId}/modules/${module.id}`}>
                                        Review Module
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            ) : moduleStatus === 'in_progress' ? (
                                <Button asChild className="w-full">
                                    <Link href={`/patient/programs/${programId}/modules/${module.id}`}>
                                        Continue Module
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    className="w-full"
                                    onClick={() => handleStartModule(module.id)}
                                    disabled={isPending}
                                >
                                    {isPending ? "Starting..." : "Start Module"}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}