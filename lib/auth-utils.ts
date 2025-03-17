// lib/auth-utils.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

/**
 * Gets the authenticated user or redirects to log in
 */
export async function getAuthUser(): Promise<SupabaseUser> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        redirect('/login');
    }

    return data.user as unknown as SupabaseUser;
}

/**
 * Gets the authenticated user without redirecting
 */
export async function getAuthUserSafe(): Promise<SupabaseUser | null> {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user ? (data.user as unknown as SupabaseUser) : null;
}

/**
 * Gets the user's profile from the users table
 * @param userId User ID to fetch profile for
 * @param fields Optional fields to select (defaults to all fields)
 */
export async function getUserProfile(userId: string, fields = '*'): Promise<UserProfile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('users')
        .select(fields)
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data as unknown as UserProfile;
}


/**
 * Checks if a user exists with the given email
 * @param email is used to check if the user exists
 */
export async function checkIfUserExists(email: string): Promise<boolean | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)

    if (error) {
        console.error('Error checking if user exists:', error);
        return null;
    }

    return data && data.length > 0;

}


/**
 * Gets both auth user and profile in one call
 * If requireAuth is true, redirects to log in when not authenticated
 */
export async function getUser(requireAuth = true): Promise<{ user: SupabaseUser | null; profile: UserProfile | null }> {
    // Get authenticated user
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
        if (requireAuth) {
            redirect('/login');
        }
        return { user: null, profile: null };
    }

    // Get user profile
    const profile = await getUserProfile(data.user.id);

    return {
        user: data.user as unknown as SupabaseUser,
        profile
    };
}

/**
 * Checks if current user has a specific role
 * Redirects to log in if not authenticated
 * Redirects to unauthorized page if wrong role
 */
export async function requireRole(role: 'admin' | 'patient'): Promise<{ user: SupabaseUser; profile: UserProfile }> {
    const { user, profile } = await getUser(true);

    if (!profile || profile.role !== role) {
        redirect('/patient');
    }

    // We know these are non-null because of the check above
    return { user: user!, profile };
}

/**
 * Shorthand for requiring admin role
 */
export async function requireAdmin() {
    return requireRole('admin');
}

/**
 * Shorthand for requiring patient role
 */
export async function requirePatient() {
    return requireRole('patient');
}