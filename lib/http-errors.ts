// app/lib/http-errors.ts

/**
 * Base class for all request-related errors
 */
export class RequestError extends Error {
    statusCode: number;
    errors?: Record<string, string[]>;

    constructor(
        statusCode: number,
        message: string,
        errors?: Record<string, string[]>
    ) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = "RequestError";

        // This is necessary for instanceof to work properly with extended built-in objects
        Object.setPrototypeOf(this, RequestError.prototype);
    }
}

/**
 * Validation error with field-specific error messages
 */
export class ValidationError extends RequestError {
    fieldErrors: Record<string, string[]>;

    constructor(fieldErrors: Record<string, string[]>) {
        const message = ValidationError.formatFieldErrors(fieldErrors);
        super(400, message, fieldErrors);
        this.name = "ValidationError";
        this.fieldErrors = fieldErrors;

        // This is necessary for instanceof to work properly with extended built-in objects
        Object.setPrototypeOf(this, ValidationError.prototype);
    }

    static formatFieldErrors(errors: Record<string, string[]>): string {
        const formattedMessages = Object.entries(errors).map(
            ([field, messages]) => {
                const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                if (messages[0] === "Required") {
                    return `${fieldName} is required`;
                } else {
                    return messages.join(" and ");
                }
            }
        );
        return formattedMessages.join(", ");
    }
}

/**
 * Error for resources that don't exist
 */
export class NotFoundError extends RequestError {
    constructor(resource: string) {
        super(404, `${resource} not found`);
        this.name = "NotFoundError";

        // This is necessary for instanceof to work properly with extended built-in objects
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * Error for forbidden actions (user is authenticated but not authorized)
 */
export class ForbiddenError extends RequestError {
    constructor(message: string = "Forbidden") {
        super(403, message);
        this.name = "ForbiddenError";

        // This is necessary for instanceof to work properly with extended built-in objects
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

/**
 * Error for unauthenticated requests
 */
export class UnauthorizedError extends RequestError {
    constructor(message: string = "Unauthorized") {
        super(401, message);
        this.name = "UnauthorizedError";

        // This is necessary for instanceof to work properly with extended built-in objects
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}