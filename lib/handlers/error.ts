// app/lib/handlers/error.ts

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { RequestError, ValidationError } from "../http-errors";

// Helper functions to extract error information
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return "An unexpected error occurred";
}

function getErrorStatus(error: unknown): number {
    if (error instanceof RequestError) {
        return error.statusCode;
    }
    return 500;
}

function getErrorDetails(error: unknown): Record<string, string[]> | undefined {
    if (error instanceof RequestError) {
        return error.errors;
    }
    if (error instanceof ZodError) {
        return error.flatten().fieldErrors as Record<string, string[]>;
    }
    return undefined;
}

// For server actions only - returns a plain object
// lib/handlers/error.ts
export function handleServerError(error: unknown): {
    success: false;
    error: {
        message: string;
        details?: Record<string, string[]>;
    };
    status: number;
} {
    // Log the error safely
    try {
        console.error("Server Error:",
            error instanceof Error
                ? error.message
                : "Unknown error"
        );
    } catch (loggingError) {
        console.error("Error during error logging");
    }

    let status = getErrorStatus(error);
    let message = getErrorMessage(error);
    let details = getErrorDetails(error);

    // Special handling for ZodError
    if (error instanceof ZodError) {
        const validationError = new ValidationError(
            error.flatten().fieldErrors as Record<string, string[]>
        );
        status = 400;
        message = validationError.message;
        details = validationError.errors;
    }

    return {
        success: false,
        error: {
            message,
            details
        },
        status
    };
}
// For API routes only - returns a NextResponse
export function handleApiError(error: unknown): NextResponse {
    // Log the error (add proper logging in production)
    console.error("API Error:", error);

    let status = getErrorStatus(error);
    let message = getErrorMessage(error);
    let details = getErrorDetails(error);

    // Special handling for ZodError
    if (error instanceof ZodError) {
        const validationError = new ValidationError(
            error.flatten().fieldErrors as Record<string, string[]>
        );
        status = 400;
        message = validationError.message;
        details = validationError.errors;
    }

    return NextResponse.json({
        success: false,
        error: {
            message,
            details
        }
    }, { status });
}

// For backward compatibility - defaults to server error handler
export default function handleError(error: unknown, responseType: "api" | "server" = "server") {
    return responseType === "api"
        ? handleApiError(error)
        : handleServerError(error);
}