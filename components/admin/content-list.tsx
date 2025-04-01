// components/admin/content-list.tsx
"use client";

import { useState } from "react";
import { deleteContentItem } from "@/lib/actions/admin/content";
import { ContentItem } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    MoreVertical,
    Edit,
    Trash2,
    Video,
    FileText,
    Link as LinkIcon,
    FileSymlink,
    ExternalLink,
    Loader2,
    Eye,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ContentListProps {
    contentItems: ContentItem[];
    moduleId: string;
    programId: string;
}

export function ContentList({ contentItems, moduleId, programId }: ContentListProps) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();

    const handleDeleteContent = async (contentId: string) => {
        setIsDeleting(contentId);
        try {
            const response = await deleteContentItem(contentId, moduleId);

            if (response.success) {
                toast({
                    title: "Content deleted",
                    description: "The content item has been successfully deleted.",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: response.error?.message || "Failed to delete content",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error deleting content:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(null);
        }
    };

    // For parsing video and document content
    const parseContentJson = (item: ContentItem) => {
        try {
            if (item.content_type === 'text') {
                return { content: item.content };
            }
            return JSON.parse(item.content);
        } catch (error) {
            console.error('Error parsing content JSON:', error);
            return {};
        }
    };

    if (contentItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 border rounded-lg bg-slate-50">
                <div className="bg-slate-100 rounded-full p-4 mb-4">
                    <FileText className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold">No content items yet</h3>
                <p className="text-muted-foreground text-center max-w-md mt-2 mb-6">
                    Start adding content to this module. Content can include text, videos, documents, and links.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {contentItems.map((item) => {
                const contentData = parseContentJson(item);

                return (
                    <Card key={item.id} className="relative overflow-hidden">
                        {/* Sequence number badge */}
                        <div className="absolute -left-4 top-4 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold">
                            {item.sequence_number}
                        </div>

                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="pl-4">
                                    <CardTitle className="text-xl flex items-center">
                                        {item.content_type === 'text' && <FileText className="h-5 w-5 mr-2 text-blue-600" />}
                                        {item.content_type === 'video' && <Video className="h-5 w-5 mr-2 text-red-500" />}
                                        {item.content_type === 'document' && <FileSymlink className="h-5 w-5 mr-2 text-green-600" />}
                                        {item.content_type === 'link' && <LinkIcon className="h-5 w-5 mr-2 text-purple-600" />}
                                        {item.title}
                                    </CardTitle>
                                    <CardDescription className="mt-1 flex items-center">
                                        <Badge className="mr-2 capitalize">
                                            {item.content_type}
                                        </Badge>
                                    </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/${item.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>View Content</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/${item.content_type}/edit/${item.id}`}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit Content</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete Content</span>
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the content item {item.title}.
                                                            This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleDeleteContent(item.id);
                                                            }}
                                                            disabled={isDeleting === item.id}
                                                        >
                                                            {isDeleting === item.id ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                    Deleting...
                                                                </>
                                                            ) : (
                                                                "Delete Content"
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
                            {item.content_type === 'text' && (
                                <div className="mt-2 text-sm text-gray-600 line-clamp-3">
                                    {item.content}
                                </div>
                            )}

                            {item.content_type === 'video' && contentData.videoUrl && (
                                <div className="mt-2">
                                    <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                                        {contentData.description}
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={contentData.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Video
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {item.content_type === 'document' && contentData.documentUrl && (
                                <div className="mt-2">
                                    <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                                        {contentData.description}
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={contentData.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Document
                                        </a>
                                    </Button>
                                </div>
                            )}

                            {item.content_type === 'link' && contentData.linkUrl && (
                                <div className="mt-2">
                                    <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                                        {contentData.description}
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={contentData.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Visit Link
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-0">
                            <Button variant="ghost" size="sm" className="ml-auto" asChild>
                                <Link href={`/admin/programs/${programId}/modules/${moduleId}/content/${item.id}`}>
                                    View Details
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}