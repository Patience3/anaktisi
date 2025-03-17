//lib/handlers/action.ts

"use server";

import { ZodError } from "zod";
import { createClient } from "@/utils/supabase/server";
import { UnauthorizedError, ValidationError } from "../http-errors";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";
import {ActionOptions, ActionSuccess} from "@/types/action";

// The action handler returns either an Error or a success result
async function action<T>({
                             params,
                             schema,
                             authorize = false,
                             requiredRole,
                         }: ActionOptions<T>): Promise<ActionSuccess<T> | Error> {
    // Create Supabase client
    const supabase = await createClient();

    // Default values
    let validatedParams = params as T;
    let user: SupabaseUser | null = null;
    let profile: UserProfile | null = null;
    let session = null;

    // Validate params with schema if provided
    if (schema && params) {
        try {
            validatedParams = schema.parse(params) as T;
        } catch (error) {
            if (error instanceof ZodError) {
                return new ValidationError(
                    error.flatten().fieldErrors as Record<string, string[]>
                );
            } else {
                return new Error("Schema validation failed");
            }
        }
    } else if (!params && schema) {
        // If schema is required but params are missing
        return new Error("Required parameters are missing");
    }

    // Check authorization if required
    if (authorize) {
        // Use the auth utility to get the user
        const authUser = await getAuthUserSafe();

        if (!authUser) {
            return new UnauthorizedError();
        }

        user = authUser;

        // Check role if required
        if (requiredRole) {
            // Use the auth utility to get the profile
            const userProfile = await getUserProfile(user.id);

            if (!userProfile) {
                return new Error("User profile not found");
            }

            profile = userProfile;

            if (profile.role !== requiredRole) {
                return new UnauthorizedError(`This action requires ${requiredRole} privileges`);
            }
        }

        // Create session object with user info
        session = {
            user: {
                id: user.id,
                email: user.email,
                role: profile?.role
            }
        };
    }

    // Return the result object - this is guaranteed to have all expected properties
    return {
        params: validatedParams as T, // Force the type to T as we've validated it
        supabase,
        session,
        user,
        profile
    };
}

export default action;