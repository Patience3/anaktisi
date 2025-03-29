"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createDocumentContent, getNextContentSequence, uploadFile } from "@/lib/actions/admin/content";
import { DocumentContentSchema, ContentItem } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileSymlink, Upload, X } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Create a modified schema where documentUrl is optional
const ModifiedDocumentSchema = DocumentContentSchema.extend({
    documentUrl: z.string().url("Please enter a valid URL").optional()
});

// Infer the type from the modified Zod schema
type DocumentContentFormValues = z.infer<typeof ModifiedDocumentSchema>;

interface DocumentContentFormProps {
    moduleId: string;
    onSuccess: (content: ContentItem) => void;
    contentItem?: ContentItem; // For editing, not implemented yet
}

export function DocumentContentForm({ moduleId, onSuccess, contentItem }: DocumentContentFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingNextSequence, setIsLoadingNextSequence] = useState(!contentItem);
    const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileUploading, setFileUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isEditMode = !!contentItem;

    // Parse content JSON if in edit mode
    const contentData = isEditMode && contentItem.content_type === 'document'
        ? JSON.parse(contentItem.content)
        : { documentUrl: '', fileType: '', description: '' };

    // Get file type from file or URL
    const getFileTypeFromFile = (file: File): string => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension) return 'Unknown';

        switch (extension) {
            case 'pdf': return 'PDF';
            case 'doc':
            case 'docx': return 'Word Document';
            case 'xls':
            case 'xlsx': return 'Excel Spreadsheet';
            case 'ppt':
            case 'pptx': return 'PowerPoint Presentation';
            case 'txt': return 'Text Document';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return 'Image';
            case 'mp3':
            case 'wav':
            case 'ogg': return 'Audio';
            case 'mp4':
            case 'webm': return 'Video';
            case 'zip':
            case 'rar': return 'Archive';
            default: return extension.toUpperCase();
        }
    };

    const getFileTypeFromUrl = (url: string): string => {
        const extension = url.split('.').pop()?.toLowerCase();
        if (!extension) return '';

        switch (extension) {
            case 'pdf': return 'PDF';
            case 'doc':
            case 'docx': return 'Word Document';
            case 'xls':
            case 'xlsx': return 'Excel Spreadsheet';
            case 'ppt':
            case 'pptx': return 'PowerPoint Presentation';
            case 'txt': return 'Text Document';
            default: return extension.toUpperCase();
        }
    };

    // Initialize React Hook Form with Zod resolver
    const form = useForm<DocumentContentFormValues>({
        resolver: zodResolver(ModifiedDocumentSchema),
        defaultValues: {
            moduleId: moduleId,
            title: contentItem?.title || "",
            documentUrl: contentData.documentUrl || "",
            fileType: contentData.fileType || "",
            description: contentData.description || "",
            sequenceNumber: contentItem?.sequence_number || 0, // We'll fetch the next sequence if not in edit mode
        },
    });

    // Fetch next sequence number on component mount if creating new content
    useEffect(() => {
        if (!isEditMode) {
            async function fetchNextSequence() {
                try {
                    const result = await getNextContentSequence(moduleId);
                    if (result.success) {
                        form.setValue("sequenceNumber", result.data as number);
                    }
                } catch (e) {
                    console.error("Failed to get next sequence number:", e);
                    // Default to 1 if we can't fetch
                    form.setValue("sequenceNumber", 1);
                } finally {
                    setIsLoadingNextSequence(false);
                }
            }

            fetchNextSequence();
        }
    }, [form, isEditMode, moduleId]);

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            // Set the title if empty
            if (!form.getValues('title')) {
                form.setValue('title', file.name.split('.')[0]);
            }

            // Automatically determine file type
            const fileType = getFileTypeFromFile(file);
            form.setValue('fileType', fileType);
        }
    };

    // Handle file upload to storage
    const uploadFile = async (): Promise<string> => {
        if (!selectedFile) {
            throw new Error("No file selected");
        }

        setFileUploading(true);
        setUploadProgress(0);

        try {
            // Here you would typically upload the file to your storage service
            // This is a mock implementation - in production, replace with actual Supabase storage upload

            // Mock upload progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                setUploadProgress(progress);
                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, 200);

            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Return a mock URL - replace with actual URL from your storage service
            const mockUrl = `https://storage.example.com/documents/module-${moduleId}/${Date.now()}-${encodeURIComponent(selectedFile.name)}`;

            setFileUploading(false);
            return mockUrl;
        } catch (error) {
            setFileUploading(false);
            throw error;
        }
    };

    async function onSubmit(data: DocumentContentFormValues) {
        setIsLoading(true);
        setError(null);

        try {
            // If using file upload and we have a selected file, upload it first
            if (uploadMethod === 'file' && selectedFile) {
                try {
                    const fileUrl = await uploadFile();
                    data.documentUrl = fileUrl;
                } catch (uploadError) {
                    setError(`Failed to upload file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
                    setIsLoading(false);
                    return;
                }
            }

            // Make sure we have either a URL or an uploaded file
            if (!data.documentUrl && uploadMethod === 'url') {
                setError("Please enter a document URL or upload a file");
                setIsLoading(false);
                return;
            }

            // Create new document content
            const result = await createDocumentContent({
                ...data,
                documentUrl: data.documentUrl || ""  // Ensure documentUrl is never undefined
            });

            if (result.success && result.data) {
                form.reset(); // Reset form on success
                setSelectedFile(null);
                onSuccess(result.data);
            } else {
                setError(result.error?.message || "Failed to save document");

                // Handle validation errors from server
                if (result.error?.details) {
                    // Set field errors from server response
                    Object.entries(result.error.details).forEach(([field, messages]) => {
                        form.setError(field as never, {
                            type: "server",
                            message: messages[0],
                        });
                    });
                }
            }
        } catch (e) {
            setError("An unexpected error occurred");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    // Generate a list of common file types
    const fileTypes = [
        "PDF",
        "Word Document",
        "Excel Spreadsheet",
        "PowerPoint Presentation",
        "Text Document",
        "Image",
        "Audio",
        "Video",
        "Archive (ZIP/RAR)",
        "Other"
    ];

    if (isLoadingNextSequence) {
        return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <Form {...form}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="mb-6">
                <div className="flex justify-center mb-4">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            onClick={() => setUploadMethod('url')}
                            className={`px-4 py-2 text-sm font-medium border ${
                                uploadMethod === 'url'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-input'
                            } rounded-l-lg hover:bg-accent hover:text-accent-foreground focus:z-10 focus:ring-2 focus:ring-ring`}
                        >
                            Use URL Link
                        </button>
                        <button
                            type="button"
                            onClick={() => setUploadMethod('file')}
                            className={`px-4 py-2 text-sm font-medium border ${
                                uploadMethod === 'file'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-input'
                            } rounded-r-lg hover:bg-accent hover:text-accent-foreground focus:z-10 focus:ring-2 focus:ring-ring`}
                        >
                            Upload File
                        </button>
                    </div>
                </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Document Title</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter document title" {...field} />
                            </FormControl>
                            <FormDescription>
                                A clear, descriptive title for this document
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {uploadMethod === 'url' ? (
                    <FormField
                        control={form.control}
                        name="documentUrl"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Document URL</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Enter URL to the document (Google Drive, Dropbox, etc.)"
                                        {...field}
                                        onChange={(e) => {
                                            field.onChange(e.target.value);
                                            // Try to determine file type from URL
                                            if (e.target.value) {
                                                const fileType = getFileTypeFromUrl(e.target.value);
                                                if (fileType && !form.getValues('fileType')) {
                                                    form.setValue('fileType', fileType);
                                                }
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormDescription>
                                    URL to the document (e.g., PDF on Google Drive, Dropbox, or other storage)
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                ) : (
                    <div className="space-y-2">
                        <FormLabel>Upload Document</FormLabel>
                        <div className="border border-dashed border-input rounded-md p-6 text-center">
                            {selectedFile ? (
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-between w-full mb-2">
                                        <div className="text-sm font-medium">{selectedFile.name}</div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            onClick={() => {
                                                setSelectedFile(null);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = '';
                                                }
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                    {fileUploading && (
                                        <div className="w-full h-2 bg-secondary rounded-full mt-2">
                                            <div
                                                className="h-full bg-primary rounded-full"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <div className="text-sm font-medium mb-1">Click to upload or drag and drop</div>
                                    <div className="text-xs text-muted-foreground mb-2">PDF, Word, Excel, PowerPoint, etc.</div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Select File
                                    </Button>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.jpg,.jpeg,.png,.mp3,.mp4"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Note: File upload is simulated in this demo. In production, files would be uploaded to your storage service.
                        </p>
                    </div>
                )}

                <FormField
                    control={form.control}
                    name="fileType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>File Type</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value || ""}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select document type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {fileTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                {uploadMethod === 'file'
                                    ? "File type detected automatically (can be changed if needed)"
                                    : "Select the type of document you're adding"}
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Document Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Provide a brief description of this document..."
                                    className="min-h-[120px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                A description of what this document contains
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="sequenceNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sequence Number</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="Content order"
                                    value={field.value || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(value === "" ? undefined : parseInt(value, 10));
                                    }}
                                    onBlur={field.onBlur}
                                />
                            </FormControl>
                            <FormDescription>
                                The order of this content in the module
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Hidden field for moduleId */}
                <input type="hidden" {...form.register("moduleId")} />

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading || form.formState.isSubmitting || fileUploading}
                    >
                        {isLoading || fileUploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {fileUploading ? "Uploading..." : (isEditMode ? "Updating..." : "Creating...")}
                            </>
                        ) : (
                            isEditMode ? "Update Document" : "Add Document"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}