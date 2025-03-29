// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/[contentId]/page.tsx
import { getContentItem } from "@/lib/actions/admin/content";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2, Video, FileText, Link as LinkIcon, FileSymlink, ExternalLink } from "lucide-react";
import Link from "next/link";
import { DeleteContentButton } from "@/components/admin/delete-content-button";

interface ContentDetailsProps {
    params: {
        programId: string;
        moduleId: string;
        contentId: string;
    };
}

// Type definitions for parsed content data
interface VideoContentData {
    videoUrl: string;
    description: string;
}

interface DocumentContentData {
    documentUrl: string;
    fileType: string;
    description: string;
}

interface LinkContentData {
    linkUrl: string;
    description: string;
}

// Generate metadata for the page
export async function generateMetadata({ params }: ContentDetailsProps): Promise<Metadata> {
    const response = await getContentItem(params.contentId);

    if (!response.success || !response.data) {
        return {
            title: "Content Details - Not Found",
        };
    }

    return {
        title: `Content Details - ${response.data.title}`,
    };
}

export default async function ContentDetails({ params }: ContentDetailsProps) {
    // Check authorization
    await requireAdmin();

    // Fetch content data
    const response = await getContentItem(params.contentId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const contentItem = response.data;
    const createdAt = new Date(contentItem.created_at);

    // Parse content JSON for rich content types
    let videoData: VideoContentData | null = null;
    let documentData: DocumentContentData | null = null;
    let linkData: LinkContentData | null = null;

    if (contentItem.content_type !== 'text') {
        try {
            const parsedContent = JSON.parse(contentItem.content);

            // Assign the parsed content to the appropriate type based on content_type
            if (contentItem.content_type === 'video') {
                videoData = parsedContent as VideoContentData;
            } else if (contentItem.content_type === 'document') {
                documentData = parsedContent as DocumentContentData;
            } else if (contentItem.content_type === 'link') {
                linkData = parsedContent as LinkContentData;
            }
        } catch (error) {
            console.error('Error parsing content JSON:', error);
        }
    }

    return (
        <div className="container mx-auto max-w-4xl">
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to module
                    </Link>
                </Button>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {contentItem.content_type === 'text' && <FileText className="h-5 w-5 text-blue-600" />}
                        {contentItem.content_type === 'video' && <Video className="h-5 w-5 text-red-500" />}
                        {contentItem.content_type === 'document' && <FileSymlink className="h-5 w-5 text-green-600" />}
                        {contentItem.content_type === 'link' && <LinkIcon className="h-5 w-5 text-purple-600" />}
                        <h1 className="text-3xl font-bold">{contentItem.title}</h1>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Created on {createdAt.toLocaleDateString()} • Sequence: {contentItem.sequence_number}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/programs/${params.programId}/modules/${params.moduleId}/content/${contentItem.content_type}/edit/${contentItem.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Link>
                    </Button>
                    <DeleteContentButton
                        contentItem={contentItem}
                        moduleId={params.moduleId}
                        programId={params.programId}
                    />
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Content</CardTitle>
                    <CardDescription className="capitalize">
                        {contentItem.content_type} content
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {contentItem.content_type === 'text' && (
                        <div className="prose max-w-none whitespace-pre-wrap">
                            {contentItem.content}
                        </div>
                    )}

                    {contentItem.content_type === 'video' && videoData && (
                        <div className="space-y-4">
                            <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                                <iframe
                                    src={`https://www.youtube.com/embed/${getYoutubeId(videoData.videoUrl)}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                ></iframe>
                            </div>
                            <div className="prose max-w-none whitespace-pre-wrap">
                                <h3>Description</h3>
                                <p>{videoData.description}</p>
                                <div className="mt-4">
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={videoData.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Open Video in New Tab
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {contentItem.content_type === 'document' && documentData && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border flex items-start gap-4">
                                <div className="bg-slate-200 rounded-md p-3">
                                    <FileSymlink className="h-8 w-8 text-slate-700" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">{contentItem.title}</h3>
                                    <p className="text-sm text-muted-foreground">{documentData.fileType || 'Document'}</p>
                                    <div className="mt-4">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={documentData.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Document
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="prose max-w-none whitespace-pre-wrap">
                                <h3>Description</h3>
                                <p>{documentData.description}</p>
                            </div>
                        </div>
                    )}

                    {contentItem.content_type === 'link' && linkData && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border flex items-start gap-4">
                                <div className="bg-slate-200 rounded-md p-3">
                                    <LinkIcon className="h-8 w-8 text-slate-700" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">{contentItem.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {linkData.linkUrl && new URL(linkData.linkUrl).hostname}
                                    </p>
                                    <div className="mt-4">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={linkData.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Visit Link
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className="prose max-w-none whitespace-pre-wrap">
                                <h3>Description</h3>
                                <p>{linkData.description}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Helper function to extract YouTube video ID
function getYoutubeId(url: string): string | null {
    if (!url) return null;

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}