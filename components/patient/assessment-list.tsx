// components/patient/assessment-list.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Clock, FileText, CheckCircle, XCircle, BookOpen } from "lucide-react";

interface Assessment {
    id: string;
    title: string;
    description: string;
    passingScore: number;
    timeLimit?: number;
    contentItemId: string;
    moduleId: string;
    moduleName: string;
    programId: string;
    programName: string;
    latestAttempt?: {
        id: string;
        startedAt: string;
        completedAt?: string;
        score?: number;
        passed?: boolean;
    } | null;
    completed: boolean;
}

interface AssessmentListProps {
    assessments: Assessment[];
    emptyMessage: string;
    type: 'available' | 'completed' | 'all';
}

export function AssessmentList({ assessments, emptyMessage, type }: AssessmentListProps) {
    const [filter, setFilter] = useState<string | null>(null);

    if (assessments.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{emptyMessage}</p>
                </CardContent>
            </Card>
        );
    }

    // Get unique programs for filtering
    const programs = [...new Set(assessments.map(a => a.programName))];

    // Apply program filter if set
    const filteredAssessments = filter
        ? assessments.filter(a => a.programName === filter)
        : assessments;

    // Sort assessments: first by program, then by module, then by completion status
    const sortedAssessments = [...filteredAssessments].sort((a, b) => {
        // First by program name
        if (a.programName !== b.programName) {
            return a.programName.localeCompare(b.programName);
        }

        // Then by module name
        if (a.moduleName !== b.moduleName) {
            return a.moduleName.localeCompare(b.moduleName);
        }

        // Then by completion status (incomplete first)
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }

        // Then by title
        return a.title.localeCompare(b.title);
    });

    return (
        <div>
            {/* Program filter */}
            {programs.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <Badge
                        variant={filter === null ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setFilter(null)}
                    >
                        All Programs
                    </Badge>
                    {programs.map(program => (
                        <Badge
                            key={program}
                            variant={filter === program ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setFilter(program)}
                        >
                            {program}
                        </Badge>
                    ))}
                </div>
            )}

            <div className="space-y-4">
                {sortedAssessments.map(assessment => (
                    <Card key={assessment.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>{assessment.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                        From {assessment.programName} / {assessment.moduleName}
                                    </CardDescription>
                                </div>

                                {assessment.completed ? (
                                    <Badge className={assessment.latestAttempt?.passed ? "bg-green-500" : "bg-red-500"}>
                                        {assessment.latestAttempt?.passed ? (
                                            <><CheckCircle className="mr-1 h-3 w-3" /> Passed</>
                                        ) : (
                                            <><XCircle className="mr-1 h-3 w-3" /> Failed</>
                                        )}
                                    </Badge>
                                ) : (
                                    <Badge>
                                        <BookOpen className="mr-1 h-3 w-3" /> Available
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent>
                            <p className="text-sm text-gray-600 mb-4">
                                {assessment.description || "Complete this assessment to evaluate your understanding."}
                            </p>

                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                <div className="flex items-center">
                                    <Clock className="mr-1 h-4 w-4" />
                                    {assessment.timeLimit ? `${assessment.timeLimit} minutes` : "No time limit"}
                                </div>

                                <div className="flex items-center">
                                    <CheckCircle className="mr-1 h-4 w-4" />
                                    Passing score: {assessment.passingScore}%
                                </div>

                                {assessment.completed && assessment.latestAttempt?.score !== undefined && (
                                    <div className="flex items-center">
                                        <FileText className="mr-1 h-4 w-4" />
                                        Your score: {assessment.latestAttempt.score}%
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter>
                            <Button asChild className={assessment.completed ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : ""}>
                                <Link href={`/patient/assessments/${assessment.id}`}>
                                    {assessment.completed ? "Review Assessment" : "Start Assessment"}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}