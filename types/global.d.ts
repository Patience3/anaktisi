// app/types/global.d.ts

// Response types for server actions
interface ActionResponse<T = null> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        details?: Record<string, string[]>;
    };
    status?: number;
}

// Auth credential types
interface AuthCredentials {
    email: string;
    password: string;
}

// Database entity types
interface User {
    id: string;
    email: string;
    role: 'admin' | 'patient';
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    profile_photo_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Define UserProfile as an alias to User for consistency
type UserProfile = User;

// Supabase Auth User
interface SupabaseUser {
    id: string;
    email?: string;
    [key: string]: unknown; // Use unknown instead of any for index signature
}

// HTTP Error interfaces for type checking
interface RequestError extends Error {
    statusCode: number;
    errors?: Record<string, string[]>;
}

interface ValidationError extends RequestError {
    fieldErrors: Record<string, string[]>;
}