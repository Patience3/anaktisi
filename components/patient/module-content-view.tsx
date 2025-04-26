// components/patient/module-content-view.tsx
"use client";

import { useState } from "react";
import { updateModuleProgress } from "@/lib/actions/patient/programs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
    FileText, Video, Link as LinkIcon, FileSymlink,
    ExternalLink, CheckCircle, Loader2
} from "lucide-react";
import Link from "next/link";

export function ModuleContentView({ contentItems, programId, moduleId }) {
    const [completedItems, setCompletedItems] = useState({});
    const [processingItem, setProcessingItem] = useState(null);
    const [updatingModule, setUpdatingModule] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const sortedItems = [...contentItems].sort((a, b) =>
        a.sequence_number - b.sequence_number
    );

    // Mark an item as completed
    const markItemCompleted = async (itemId) => {
        setProcessingItem(itemId);

        try {
            // Update local state
            setCompletedItems(prev => ({
                ...prev,
                [itemId]: true
            }));

            // Check if all items are completed
            const newCompletedItems = { ...completedItems, [itemId]: true };
            const allCompleted = sortedItems.every(
                item => newCompletedItems[item.id]
            );

            // If all completed, mark module as completed
            if (allCompleted && !updatingModule) {
                setUpdatingModule(true);

                try {
                    const result = await updateModuleProgress(moduleId, 'completed');

                    if (result.success) {
                        toast({
                            title: "Module Completed",
                            description: "Congratulations! You've completed this module."
                        });

                        // Redirect after a moment
                        setTimeout(() => {
                            router.push(`/patient/programs/${programId}`);
                            router.refresh();
                        }, 1500);
                    } else {
                        toast({
                            title: "Error",
                            description: result.error?.message || "Failed to update module progress",
                            variant: "destructive"
                        });
                    }
                } finally {
                    setUpdatingModule(false);
                }
            } else {
                toast({
                    title: "Content Completed",
                    description: "Your progress has been saved"
                });
            }
        } catch (error) {
            console.error("Error marking item completed:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setProcessingItem(null);
        }
    };

    // Parse content based on type
    const parseContent = (item) => {
        if (item.content_type === 'text') {
            return { content: item.content };
        }

        try {
            return JSON.parse(item.content);
        } catch {
            return { description: 'Content format error' };
        }
    };

    // Render different content types
    return (
        <div className="space-y-8">
            {sortedItems.map((item, index) => {
                const isCompleted = !!completedItems[item.id];
                const isProcessing = processingItem === item.id;
                const parsedContent = parseContent(item);

                return (
                    <div key={item.id} id={`item-${item.id}`} className="scroll-mt-20">
                        {index > 0 && <Separator className="mb-8" />}

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-semibold">
                                    {index + 1}. {item.title}
                                </h3>
                                <Badge variant={isCompleted ? "default" : "outline"}>
                                    {isCompleted ? (
                                        <>
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                            Completed
                                        </>
                                    ) : 'Not Completed'}
                                </Badge>
                            </div>
                        </div>

                        {/* Text content */}
                        {item.content_type === 'text' && (
                            <div className="prose max-w-none">
                                <div className="bg-gray-50 rounded-lg p-6 border">
                                    <p className="whitespace-pre-wrap">{item.content}</p>
                                </div>

                                {!isCompleted && (
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={() => markItemCompleted(item.id)}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Marking as Complete...
                                                </>
                                            ) : "Mark as Completed"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Video content */}
                        {item.content_type === 'video' && (
                            <div>
                                <div className="bg-gray-50 rounded-lg p-6 border">
                                    <div className="flex items-start gap-4">
                                        <Video className="h-10 w-10 text-blue-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-gray-700 mb-4">
                                                {parsedContent.description || "No description provided"}
                                            </p>
                                            <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                                                <p className="text-blue-700 mb-2">Video Link:</p>
                                                <Button variant="outline" asChild>
                                                    <a
                                                        href={parsedContent.videoUrl || "#"}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        Open Video in New Tab
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {!isCompleted && (
                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={() => markItemCompleted(item.id)}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Marking as Watched...
                                                </>
                                            ) : "Mark as Watched"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Document content */}
                        {item.content_type === 'document' && (
                            <div>
                                <div className="bg-gray-50 rounded-lg p-6 border">
                                    <div className="flex items-start gap-4">
                                        <FileSymlink className="h-10 w-10 text-green-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-gray-700 mb-4">
                                                {parsedContent.description || "No description provided"}
                                            </p>
                                            <div className="bg-green-50 border border-green-100 rounded-md p-4">
                                                // components/patient/module-content-view.tsx (continued)
                                                {/* Document content (continued) */}
                                                <div className="bg-green-50 border border-green-100 rounded-md p-4">
                                                    <p className="text-green-700 mb-2">
                                                        Document Type: {parsedContent.fileType || "Unknown type"}
                                                    </p>
                                                    <Button variant="outline" className="gap-2" asChild>
                                                        <a
                                                            href={parsedContent.documentUrl || "#"}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                            Open Document
                                                        </a>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!isCompleted && (
                                        <div className="mt-4 flex justify-end">
                                            <Button
                                                onClick={() => markItemCompleted(item.id)}
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Marking as Read...
                                                    </>
                                                ) : "Mark as Read"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                )}

                                {/* Link content */}
                                {item.content_type === 'link' && (
                                    <div>
                                        <div className="bg-gray-50 rounded-lg p-6 border">
                                            <div className="flex items-start gap-4">
                                                <LinkIcon className="h-10 w-10 text-purple-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-gray-700 mb-4">
                                                        {parsedContent.description || "No description provided"}
                                                    </p>
                                                    <div className="bg-purple-50 border border-purple-100 rounded-md p-4">
                                                        <p className="text-purple-700 mb-2">External Resource Link:</p>
                                                        <Button variant="outline" className="gap-2" asChild>
                                                            <a
                                                                href={parsedContent.linkUrl || "#"}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                                Visit Link
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {!isCompleted && (
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    onClick={() => markItemCompleted(item.id)}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Marking as Visited...
                                                        </>
                                                    ) : "Mark as Visited"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Assessment content */}
                                {item.content_type === 'assessment' && (
                                    <div>
                                        <div className="bg-gray-50 rounded-lg p-6 border">
                                            <div className="flex items-start gap-4">
                                                <FileText className="h-10 w-10 text-amber-500 flex-shrink-0" />
                                                <div>
                                                    <p className="text-gray-700 mb-4">
                                                        {parsedContent.description || "No description provided"}
                                                    </p>
                                                    <div className="bg-amber-50 border border-amber-100 rounded-md p-4">
                                                        <p className="text-amber-700 mb-2">Assessment:</p>
                                                        <p className="text-sm text-amber-800 mb-4">
                                                            This assessment will help evaluate your understanding and progress.
                                                            {parsedContent.timeLimitMinutes &&
                                                                ` You will have ${parsedContent.timeLimitMinutes} minutes to complete it.`}
                                                        </p>
                                                        <Button variant="outline" className="gap-2">
                                                            <Link href={`/patient/assessments/${parsedContent.assessmentId || item.id}`}>
                                                                Take Assessment
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {!isCompleted && (
                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    onClick={() => markItemCompleted(item.id)}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Marking as Completed...
                                                        </>
                                                    ) : "Mark as Completed"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                        })}

                        {/* Module completion section */}
                        {sortedItems.length > 0 && (
                            <div className="mt-8 pt-4 border-t">
                                <div className="flex justify-between items-center">
                                    <p className="text-gray-500">
                                        {Object.keys(completedItems).length} of {sortedItems.length} items completed
                                    </p>

                                    <div className="flex gap-2">
                                        {updatingModule ? (
                                            <Button disabled>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Completing Module...
                                            </Button>
                                        ) : (
                                            <>
                                                <Button variant="outline" asChild>
                                                    <Link href={`/patient/programs/${programId}`}>
                                                        Return to Program
                                                    </Link>
                                                </Button>

                                                {Object.keys(completedItems).length === sortedItems.length && (
                                                    <Button
                                                        onClick={async () => {
                                                            setUpdatingModule(true);
                                                            try {
                                                                const result = await updateModuleProgress(moduleId, 'completed');

                                                                if (result.success) {
                                                                    toast({
                                                                        title: "Module Completed",
                                                                        description: "Congratulations! You've completed this module."
                                                                    });

                                                                    router.push(`/patient/programs/${programId}`);
                                                                    router.refresh();
                                                                } else {
                                                                    toast({
                                                                        title: "Error",
                                                                        description: result.error?.message || "Failed to update module progress",
                                                                        variant: "destructive"
                                                                    });
                                                                }
                                                            } catch (error) {
                                                                console.error("Error updating module progress:", error);
                                                                toast({
                                                                    title: "Error",
                                                                    description: "An unexpected error occurred",
                                                                    variant: "destructive"
                                                                });
                                                            } finally {
                                                                setUpdatingModule(false);
                                                            }
                                                        }}
                                                    >
                                                        Complete Module
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
