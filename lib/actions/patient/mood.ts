// lib/actions/patient/mood.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { handleServerError } from "@/lib/handlers/error";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";
import { z } from "zod";

// Define mood entry interface
export interface MoodEntry {
    id: string;
    patient_id: string;
    content_item_id: string | null;
    mood_type: 'happy' | 'calm' | 'neutral' | 'stressed' | 'sad' | 'angry' | 'anxious';
    mood_score: number;
    journal_entry: string | null;
    entry_timestamp: string;
    created_at: string;
}

// Schema for mood entry
const MoodEntrySchema = z.object({
    moodType: z.enum(['happy', 'calm', 'neutral', 'stressed', 'sad', 'angry', 'anxious']),
    moodScore: z.number().min(1).max(10),
    journalEntry: z.string().optional(),
    contentItemId: z.string().uuid("Invalid content item ID").optional(),
});

/**
 * Submit a mood entry
 */
export async function submitMoodEntry(
    moodType: string,
    moodScore: number,
    journalEntry?: string,
    contentItemId?: string
): Promise<ActionResponse<MoodEntry>> {
    try {
        // Validate the data
        const validData = MoodEntrySchema.parse({
            moodType,
            moodScore,
            journalEntry,
            contentItemId
        });

        // Get the authenticated user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return {
                success: false,
                error: {
                    message: "Not authenticated"
                },
                status: 401
            };
        }

        // Get user profile to verify it's a patient
        const profile = await getUserProfile(authUser.id);

        if (!profile || profile.role !== 'patient') {
            return {
                success: false,
                error: {
                    message: "Access denied. Patient role required."
                },
                status: 403
            };
        }

        const supabase = await createClient();

        // Create mood entry
        const { data, error } = await supabase
            .from("mood_entries")
            .insert({
                patient_id: authUser.id,
                content_item_id: validData.contentItemId || null,
                mood_type: validData.moodType,
                mood_score: validData.moodScore,
                journal_entry: validData.journalEntry || null,
                entry_timestamp: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        // Revalidate the mood tracking page
        revalidatePath('/patient/mood');

        return {
            success: true,
            data: data as MoodEntry
        };
    } catch (error) {
        console.error("Error in submitMoodEntry:", error);
        return handleServerError(error);
    }
}

/**
 * Get patient's mood entries
 */
export async function getMoodEntries(limit: number = 10): Promise<ActionResponse<MoodEntry[]>> {
    try {
        // Get the authenticated user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return {
                success: false,
                error: {
                    message: "Not authenticated"
                },
                status: 401
            };
        }

        // Get user profile to verify it's a patient
        const profile = await getUserProfile(authUser.id);

        if (!profile || profile.role !== 'patient') {
            return {
                success: false,
                error: {
                    message: "Access denied. Patient role required."
                },
                status: 403
            };
        }

        const supabase = await createClient();

        // Get mood entries
        const { data, error } = await supabase
            .from("mood_entries")
            .select("*")
            .eq("patient_id", authUser.id)
            .order("entry_timestamp", { ascending: false })
            .limit(limit);

        if (error) {
            throw error;
        }

        return {
            success: true,
            data: data as MoodEntry[] || []
        };
    } catch (error) {
        console.error("Error in getMoodEntries:", error);
        return handleServerError(error);
    }
}