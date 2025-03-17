// lib/actions/auth/index.ts

"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import action from "../../handlers/action";
import { handleServerError } from "../../handlers/error";
import { NotFoundError } from "../../http-errors";
import { SignInSchema, CreatePatientSchema } from "../../validations";
import {checkIfUserExists, getAuthUserSafe, getUserProfile} from "@/lib/auth-utils";
import {CreatePatientParams, CreatePatientResponse, SignInResponse} from "@/types/action";

export async function signInWithCredentials(
    params: AuthCredentials
): Promise<ActionResponse<SignInResponse>> {
    const validationResult = await action({ params, schema: SignInSchema });

    if (validationResult instanceof Error) {
        return handleServerError(validationResult);
    }

    const { params: validatedParams, supabase } = validationResult;

    try {
        // Sign in with Supabase
        const { error } = await supabase.auth.signInWithPassword({
            email: validatedParams.email,
            password: validatedParams.password,
        });

        if (error) throw new Error(error.message);

        // Get user data to check if they're an admin or patient
        const user = await getAuthUserSafe();

        if (!user) throw new NotFoundError("User");

        // Get user profile to check role
        const profile = await getUserProfile(user.id, "role, first_name, last_name");

        if (!profile) throw new NotFoundError("Profile");

        if (!["admin", "patient"].includes(profile.role)) {
            await supabase.auth.signOut();
            throw new Error("Unauthorized access - invalid role");
        }

        // Revalidate paths that might show user data
        revalidatePath("/");

        // Return success with role info - client will handle redirection
        return {
            success: true,
            data: {
                role: profile.role,
                firstName: profile.first_name,
                lastName: profile.last_name
            }
        };
    } catch (error) {
        return handleServerError(error);
    }
}

export async function createPatientAccount(
    params: CreatePatientParams
): Promise<ActionResponse<CreatePatientResponse>> {
    const validationResult = await action({
        params,
        schema: CreatePatientSchema,
        authorize: true,
        requiredRole: "admin"
    });

    if (validationResult instanceof Error) {
        return handleServerError(validationResult);
    }

    // Extract the validated params and NOT the Supabase client
    const { params: validatedParams } = validationResult;

    try {
        // Use admin client for user creation
        const supabase = createAdminClient();

        // Additional server-side validation that can't be done in the schema
        // Check if user already exists
        const userExists = await checkIfUserExists(validatedParams.email);

        if (userExists) {
            return {
                success: false,
                error: {
                    message: "What do you think you're doing? 😂",
                    details: {
                        email: ["This email address is already registered"]
                    }
                },
                status: 400
            };
        }

        // Generate a strong random password
        // const tempPassword = randomBytes(12).toString("hex");

        // // Use email as initial password
        // const tempPassword = validatedParams.email;

        // Generate a secure temporary password
        const tempPassword = generateSecurePassword();


        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: validatedParams.email,
            password: tempPassword,
            email_confirm: true, // Auto-confirm the email

        });

        if (authError || !authData.user) {
            console.log(authError?.message);
            throw new Error(authError?.message || "Failed to create user account");
        }

        // Create user profile
        const { error: profileError } = await supabase
            .from("users")
            .insert({
                id: authData.user.id,
                email: validatedParams.email,
                role: "patient",
                first_name: validatedParams.firstName,
                last_name: validatedParams.lastName,
                gender: validatedParams.gender || null,
                date_of_birth: validatedParams.dateOfBirth || null,
                phone: validatedParams.phone || null,
                is_active: true,
            });

        if (profileError) {
            // Clean up by deleting the auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw new Error(profileError.message);
        }

        // Revalidate the patient list page
        revalidatePath("/admin/patient");

        // Return success with password - client will handle UI
        return {
            success: true,
            data: {
                tempPassword
            }
        };
    } catch (error) {
        return handleServerError(error);
    }
}

export async function signOut(): Promise<ActionResponse> {
    try {
        const validationResult = await action({ authorize: true });

        if (validationResult instanceof Error) {
            return handleServerError(validationResult);
        }

        const { supabase } = validationResult;
        await supabase.auth.signOut();

        // No redirect - just return success
        return { success: true };
    } catch (error) {
        return handleServerError(error);
    }
}


// Secure password generation
function generateSecurePassword(length = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+';

    // Ensure at least one character from each category
    let password = '';
    const allChars = lowercase + uppercase + numbers + special;

    // Generate random values for crypto-safe randomness
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    // Add at least one of each character type
    password += lowercase[randomValues[0] % lowercase.length];
    password += uppercase[randomValues[1] % uppercase.length];
    password += numbers[randomValues[2] % numbers.length];
    password += special[randomValues[3] % special.length];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += allChars[randomValues[i] % allChars.length];
    }

    // Shuffle the password characters
    return password
        .split('')
        .sort(() => 0.5 - Math.random())
        .join('');
}