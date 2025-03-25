// lib/actions/admin/content.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { requireAdmin } from "@/lib/auth-utils";
import { z } from "zod";
import {
    TextContentSchema,
    VideoContentSchema,
    DocumentContentSchema,
    LinkContentSchema,
    ContentItem
} from "@/lib/validations";

/**
 * Get all content items for a module
 */
export async function getModuleContent(moduleId: string): Promise<ActionResponse<ContentItem[]>> {
    try {
        // Validate the moduleId
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get content items with creator information
        const { data, error } = await supabase
            .from("content_items")
            .select(`
        *,
        created_by:users(first_name, last_name)
      `)
            .eq("module_id", validModuleId)
            .order("sequence_number", { ascending: true });

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data as ContentItem[]
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get a single content item by ID
 */
export async function getContentItem(contentId: string): Promise<ActionResponse<ContentItem>> {
    try {
        // Validate the id
        const validId = z.string().uuid("Invalid ID format").parse(contentId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get content item with creator information
        const { data, error } = await supabase
            .from("content_items")
            .select(`
        *,
        created_by:users(first_name, last_name)
      `)
            .eq("id", validId)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error("Content item not found");
        }

        return {
            success: true,
            data: data as ContentItem
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Get the next available sequence number for content in a module
 */
export async function getNextContentSequence(moduleId: string): Promise<ActionResponse<number>> {
    try {
        // Validate the moduleId
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get the highest sequence number currently in use
        const { data, error } = await supabase
            .from("content_items")
            .select("sequence_number")
            .eq("module_id", validModuleId)
            .order("sequence_number", { ascending: false })
            .limit(1);

        if (error) {
            throw error;
        }

        // If there are no content items yet, start at 1
        const nextSequence = data.length > 0 ? data[0].sequence_number + 1 : 1;

        return {
            success: true,
            data: nextSequence
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new text content item
 */
export async function createTextContent(params: z.infer<typeof TextContentSchema>): Promise<ActionResponse<ContentItem>> {
    try {
        // Validate the data
        const validParams = TextContentSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Create the new content item
        const { data, error } = await supabase
            .from("content_items")
            .insert({
                module_id: validParams.moduleId,
                title: validParams.title,
                content_type: 'text',
                content: validParams.content,
                sequence_number: validParams.sequenceNumber,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);

        return {
            success: true,
            data: data as ContentItem
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new video content item
 */
export async function createVideoContent(params: z.infer<typeof VideoContentSchema>): Promise<ActionResponse<ContentItem>> {
    try {
        // Validate the data
        const validParams = VideoContentSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Format content as JSON with video URL and description
        const content = JSON.stringify({
            videoUrl: validParams.videoUrl,
            description: validParams.description
        });

        // Create the new content item
        const { data, error } = await supabase
            .from("content_items")
            .insert({
                module_id: validParams.moduleId,
                title: validParams.title,
                content_type: 'video',
                content: content,
                sequence_number: validParams.sequenceNumber,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);

        return {
            success: true,
            data: data as ContentItem
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new document content item
 */
export async function createDocumentContent(params: z.infer<typeof DocumentContentSchema>): Promise<ActionResponse<ContentItem>> {
    try {
        // Validate the data
        const validParams = DocumentContentSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Format content as JSON with document URL and description
        const content = JSON.stringify({
            documentUrl: validParams.documentUrl,
            description: validParams.description
        });

        // Create the new content item
        const { data, error } = await supabase
            .from("content_items")
            .insert({
                module_id: validParams.moduleId,
                title: validParams.title,
                content_type: 'document',
                content: content,
                sequence_number: validParams.sequenceNumber,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);

        return {
            success: true,
            data: data as ContentItem
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Create a new link content item
 */
export async function createLinkContent(params: z.infer<typeof LinkContentSchema>): Promise<ActionResponse<ContentItem>> {
    try {
        // Validate the data
        const validParams = LinkContentSchema.parse(params);

        // Ensure the user is an admin
        const { user } = await requireAdmin();

        const supabase = await createClient();

        // Format content as JSON with link URL and description
        const content = JSON.stringify({
            linkUrl: validParams.linkUrl,
            description: validParams.description
        });

        // Create the new content item
        const { data, error } = await supabase
            .from("content_items")
            .insert({
                module_id: validParams.moduleId,
                title: validParams.title,
                content_type: 'link',
                content: content,
                sequence_number: validParams.sequenceNumber,
                created_by: user.id
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validParams.moduleId}`);

        return {
            success: true,
            data: data as ContentItem
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Delete a content item
 */
export async function deleteContentItem(contentId: string, moduleId: string): Promise<ActionResponse> {
    try {
        // Validate the ids
        const validContentId = z.string().uuid("Invalid content ID").parse(contentId);
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Delete the content item
        const { error } = await supabase
            .from("content_items")
            .delete()
            .eq("id", validContentId);

        if (error) {
            throw error;
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validModuleId}`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}

/**
 * Update content sequence numbers to ensure they are consecutive
 */
export async function reorderContentItems(moduleId: string): Promise<ActionResponse> {
    try {
        // Validate the moduleId
        const validModuleId = z.string().uuid("Invalid module ID").parse(moduleId);

        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get all content items for the module, ordered by current sequence
        const { data: contentItems, error } = await supabase
            .from("content_items")
            .select("id, sequence_number")
            .eq("module_id", validModuleId)
            .order("sequence_number");

        if (error) {
            throw error;
        }

        // Update each content item with a new, consecutive sequence number
        for (let i = 0; i < contentItems.length; i++) {
            const newSequence = i + 1;
            if (contentItems[i].sequence_number !== newSequence) {
                await supabase
                    .from("content_items")
                    .update({ sequence_number: newSequence })
                    .eq("id", contentItems[i].id);
            }
        }

        // Refresh the content list
        revalidatePath(`/admin/programs/*/modules/${validModuleId}`);

        return {
            success: true
        };
    } catch (error) {
        return handleServerError(error);
    }
}