// types/action.d.ts
import { ZodSchema } from "zod";
import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from '@supabase/supabase-js';

// Action handler options and return types
interface ActionOptions<T = any> {
    params?: T;
    schema?: ZodSchema<T>;
    authorize?: boolean;
    requiredRole?: 'admin' | 'patient' | string;
}

// Action handler success result
interface ActionSuccess<T = any> {
    params: T;
    supabase: SupabaseClient;
    session: {
        user: {
            id: string;
            email?: string;
            role?: string;
        }
    } | null;
    user: SupabaseUser | null;
    profile: UserProfile | null;
}

// Type for Supabase user from auth
interface SupabaseUser {
    id: string;
    email: string;
}

// Type for user profile
interface UserProfile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    profile_photo_url?: string;
}

// Response type for all server actions
interface ActionResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        details?: Record<string, string[]>;
    };
    status?: number;
}

// Auth response types
interface SignInResponse {
    role: string;
    firstName?: string;
    lastName?: string;
}

interface CreatePatientResponse {
    tempPassword: string;
}

// Auth params types
interface CreatePatientParams {
    email: string;
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    programId?: string;
}

interface SignUpCredentials {
    email: string;
    password: string;
    name: string;
    username: string;
}

// Program types
interface CreateProgramParams {
    title: string;
    description: string;
    categoryId: string;
    durationDays?: number;
    isSelfPaced: boolean;
}

interface UpdateProgramParams extends CreateProgramParams {
    programId: string;
}

// Module types
interface CreateModuleParams {
    programId: string;
    title: string;
    description: string;
    sequenceNumber: number;
    estimatedMinutes?: number;
    isRequired: boolean;
}

interface UpdateModuleParams extends CreateModuleParams {
    moduleId: string;
}

// Content types
interface CreateContentParams {
    moduleId: string;
    title: string;
    contentType: 'video' | 'text' | 'document' | 'link' | 'assessment';
    content: string;
    sequenceNumber: number;
}

interface UpdateContentParams extends CreateContentParams {
    contentId: string;
}

// Assessment types
interface CreateAssessmentParams {
    contentItemId: string;
    title: string;
    description?: string;
    passingScore: number;
    timeLimitMinutes?: number;
}

interface CreateQuestionParams {
    assessmentId: string;
    questionText: string;
    questionType: 'multiple_choice' | 'true_false' | 'text_response';
    sequenceNumber: number;
    points: number;
}

// Enrollment types
interface CreateEnrollmentParams {
    patientId: string;
    programId: string;
    startDate: string;
    expectedEndDate?: string;
}

interface UpdateEnrollmentStatusParams {
    enrollmentId: string;
    status: 'assigned' | 'in_progress' | 'completed' | 'dropped';
}

// Progress tracking
interface UpdateModuleProgressParams {
    patientId: string;
    moduleId: string;
    status: 'not_started' | 'in_progress' | 'completed';
    timeSpentSeconds?: number;
}

// Mood entry
interface CreateMoodEntryParams {
    patientId: string;
    contentItemId?: string;
    moodType: 'happy' | 'calm' | 'neutral' | 'stressed' | 'sad' | 'angry' | 'anxious';
    moodScore: number;
    journalEntry?: string;
}

// Pagination params
interface GetPaginatedParams {
    page?: number;
    pageSize?: number;
    query?: string;
    filter?: string;
    sort?: string;
}