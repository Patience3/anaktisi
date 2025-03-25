"use client";

import { useState } from "react";
import { Module, deleteModule, updateModuleSequence } from "@/lib/actions/admin/module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import {
    ArrowUp,
    ArrowDown,
    Clock,
    MoreVertical,
    Edit,
    FileText,
    Trash2,
    ChevronRight,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ModulesListProps {
    modules: Module[];
    programId: string;
}

export function ModulesList({ modules, programId }: ModulesListProps) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isReordering, setIsReordering] = useState<string | null>(null);
    const router = useRouter();

    const handleDeleteModule = async (moduleId: string) => {
        setIsDeleting(moduleId);
        try {
            const response = await deleteModule(moduleId, programId);

            if (response.success) {
                toast({
                    title: "Module deleted",
                    description: "The module has been successfully deleted.",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: response.error?.message || "Failed to delete module",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting module:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(null);
        }
    };

    const handleMoveModule = async (moduleId: string, currentSequence: number, direction: 'up' | 'down') => {
        setIsReordering(moduleId);
        const newSequence = direction === 'up' ? currentSequence - 1 : currentSequence + 1;

        // Don't move if already at the top or bottom
        if (newSequence < 1 || newSequence > modules.length) {
            setIsReordering(null);
            return;
        }

        try {
            const response = await updateModuleSequence(moduleId, newSequence, programId);

            if (response.success) {
                toast({
                    title: "Module reordered",
                    description: "The module sequence has been updated.",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: response.error?.message || "Failed to reorder module",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error reordering module:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsReordering(null);
        }
    };

    return (
        <div className="space-y-4">
            {modules.map((module, index) => (
                <Card key={module.id} className="relative">
                    {/* Sequence number badge */}
                    <div className="absolute -left-4 top-4 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                        {module.sequence_number}
                    </div>

                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl">
                                    <Link
                                        href={`/admin/programs/${programId}/modules/${module.id}`}
                                        className="hover:text-primary hover:underline focus:outline-none transition-colors"
                                    >
                                        {module.title}
                                    </Link>
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {module.description.length > 150
                                        ? `${module.description.substring(0, 150)}...`
                                        : module.description}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex flex-col gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-8 h-8 p-0"
                                        disabled={module.sequence_number <= 1 || !!isReordering}
                                        onClick={() => handleMoveModule(module.id, module.sequence_number, 'up')}
                                    >
                                        {isReordering === module.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ArrowUp className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-8 h-8 p-0"
                                        disabled={module.sequence_number >= modules.length || !!isReordering}
                                        onClick={() => handleMoveModule(module.id, module.sequence_number, 'down')}
                                    >
                                        {isReordering === module.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <ArrowDown className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/admin/programs/${programId}/modules/${module.id}`}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>View Details</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/admin/programs/${programId}/modules/${module.id}/edit`}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Edit Module</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete Module</span>
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently delete the module "{module.title}" and all its content.
                                                        This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDeleteModule(module.id);
                                                        }}
                                                        disabled={isDeleting === module.id}
                                                    >
                                                        {isDeleting === module.id ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Deleting...
                                                            </>
                                                        ) : (
                                                            "Delete Module"
                                                        )}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {module.estimated_minutes
                                        ? `${module.estimated_minutes} minutes`
                                        : "No time estimate"}
                                </span>
                            </div>
                            <Badge variant={module.is_required ? "outline" : "secondary"}>
                                {module.is_required ? "Required" : "Optional"}
                            </Badge>
                            <Badge variant="secondary" className="bg-slate-100">
                                {module.total_content_items || 0} content items
                            </Badge>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button variant="ghost" size="sm" className="ml-auto" asChild>
                            <Link href={`/admin/programs/${programId}/modules/${module.id}`}>
                                View Details
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}