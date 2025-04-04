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
// global.d.ts

// Basic Supabase Auth User type
interface SupabaseUser {
    id: string;
    email?: string;
    app_metadata: {
        provider?: string;
        [key: string]: any;
    };
    user_metadata: {
        [key: string]: any;
    };
    aud: string;
}

// User profile structure
interface UserProfile {
    id: string;
    email: string;
    role: 'admin' | 'patient';
    first_name: string;
    last_name: string;
    is_active: boolean;
    [key: string]: any;
}

// Session object structure
interface Session {
    user: {
        id: string;
        email?: string;
        role?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

// Generic type for Action response
interface ActionResponse<T = any> {
    success: boolean;
    data?: T | null;
    error?: {
        message: string;
        details?: Record<string, string[]>;
    };
    status?: number;
}

// Action options for the handler
interface ActionOptions<T> {
    params?: T;
    schema?: any;
    authorize?: boolean;
    requiredRole?: 'admin' | 'patient';
}

// Action success structure
interface ActionSuccess<T> {
    params: T;
    supabase: any;
    session?: Session | null;
    user?: SupabaseUser | null;
    profile?: UserProfile | null;
}