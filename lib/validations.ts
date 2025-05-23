// app/lib/validations.ts

import { z } from "zod";

//auth schemas

// Utility to calculate age from date of birth
const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

// Enhanced schema with more sophisticated validation
export const CreatePatientSchema = z.object({
  email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .refine(email => !email.endsWith("gmail.test"), {
        message: "This email provider is not supported"
      }),

  firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name cannot exceed 50 characters")
      .refine(name => /^[a-zA-Z\s\-']+$/.test(name), {
        message: "First name can only contain letters, spaces, hyphens, and apostrophes"
      }),

  lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name cannot exceed 50 characters")
      .refine(name => /^[a-zA-Z\s\-']+$/.test(name), {
        message: "Last name can only contain letters, spaces, hyphens, and apostrophes"
      }),

  dateOfBirth: z
      .string()
      .refine(dob => !dob || dob.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(dob), {
        message: "Date must be in YYYY-MM-DD format"
      })
      .refine(dob => {
        if (!dob || dob.length === 0) return true;
        const dobDate = new Date(dob);
        return !isNaN(dobDate.getTime());
      }, {
        message: "Invalid date"
      })
      .refine(dob => {
        if (!dob || dob.length === 0) return true;
        const dobDate = new Date(dob);
        return dobDate < new Date(); // Must be in the past
      }, {
        message: "Date of birth must be in the past"
      })
      .refine(dob => {
        if (!dob || dob.length === 0) return true;
        const dobDate = new Date(dob);
        const age = calculateAge(dobDate);
        return age >= 15 && age <= 60; // Must be between 15 and 60 years old
      }, {
        message: "Patient must be between 15 and 60 years old"
      })
      .optional(),

  gender: z
      .string()
      .refine(gender => !gender || ['male', 'female'].includes(gender), {
        message: "Please select a valid gender option"
      })
      .optional(),

  phone: z
      .string()
      .refine(phone => !phone || /^(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(phone), {
        message: "Please enter a valid phone number"
      })
      .optional()
});



export const SignInSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const SignUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});



export const CreateContentSchema = z.object({
  moduleId: z.string().uuid("Valid module ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  contentType: z.enum(['video', 'text', 'assessment'], {
    errorMap: () => ({ message: "Content type must be video, text, or assessment" })
  }),
  content: z.string().min(1, "Content is required"),
  sequenceNumber: z.number().int().min(1, "Sequence number must be at least 1")
});

export const CreateAssessmentSchema = z.object({
  contentItemId: z.string().uuid("Valid content item ID is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  passingScore: z.number().int().min(1, "Passing score must be at least 1"),
  timeLimitMinutes: z.number().int().positive().optional()
});

export const CreateEnrollmentSchema = z.object({
  patientId: z.string().uuid("Valid patient ID is required"),
  programId: z.string().uuid("Valid program ID is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  expectedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected end date must be in YYYY-MM-DD format").optional()
});

export const UpdateModuleProgressSchema = z.object({
  patientId: z.string().uuid("Valid patient ID is required"),
  moduleId: z.string().uuid("Valid module ID is required"),
  status: z.enum(['not_started', 'in_progress', 'completed'], {
    errorMap: () => ({ message: "Status must be not_started, in_progress, or completed" })
  }),
  timeSpentSeconds: z.number().int().min(0).optional()
});

export const CreateMoodEntrySchema = z.object({
  patientId: z.string().uuid("Valid patient ID is required"),
  contentItemId: z.string().uuid("Valid content item ID is required").optional(),
  moodType: z.enum(['happy', 'calm', 'neutral', 'stressed', 'sad', 'angry', 'anxious'], {
    errorMap: () => ({ message: "Invalid mood type" })
  }),
  moodScore: z.number().int().min(1).max(10, "Mood score must be between 1 and 10"),
  journalEntry: z.string().optional()
});


// Program creation/update schema with improved validation
export const CreateProgramSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    categoryId: z.string().uuid("Valid category ID is required"),
    durationDays: z
        .number()
        .int("Duration must be a whole number")
        .positive("Duration must be a positive number")
        .optional()
        .nullable(),
    isSelfPaced: z.boolean().default(false)
});

// Module creation/update schema with validation
export const CreateModuleSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    programId: z.string().uuid("Valid program ID is required"),
    sequenceNumber: z.number().int("Sequence must be a whole number").positive("Sequence must be positive"),
    estimatedMinutes: z
        .number()
        .int("Duration must be a whole number")
        .positive("Duration must be positive")
        .optional(),
    isRequired: z.boolean().default(true)
});



// Module ID validation schema
export const ModuleIdSchema = z.object({
    id: z.string().uuid("Invalid module ID format")
});

// Module sequence update schema
export const UpdateModuleSequenceSchema = z.object({
    moduleId: z.string().uuid("Invalid module ID format"),
    programId: z.string().uuid("Invalid program ID format"),
    newSequence: z.number().int("Sequence must be a whole number").positive("Sequence must be positive")
});



// Text content schema
export const TextContentSchema = z.object({
    moduleId: z.string().uuid("Valid module ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
    sequenceNumber: z
        .number()
        .int("Sequence must be a whole number")
        .positive("Sequence must be positive")
});

// Video content schema
export const VideoContentSchema = z.object({
    moduleId: z.string().uuid("Valid module ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    videoUrl: z.string().url("Please enter a valid URL"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    sequenceNumber: z
        .number()
        .int("Sequence must be a whole number")
        .positive("Sequence must be positive")
});

// Base content item type
export type ContentItem = {
    id: string;
    module_id: string;
    title: string;
    content_type: 'video' | 'text' | 'document' | 'link';
    content: string;
    sequence_number: number;
    created_by: string;
    created_at: string;
    updated_at: string;
};


// Link content schema
export const LinkContentSchema = z.object({
    moduleId: z.string().uuid("Valid module ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    linkUrl: z.string().url("Please enter a valid URL"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    sequenceNumber: z
        .number()
        .int("Sequence must be a whole number")
        .positive("Sequence must be positive")
});


// This content should be added to your lib/validations.ts file or create a new assessment-validations.ts file

// Enhanced document content schema with file type support
export const DocumentContentSchema = z.object({
    moduleId: z.string().uuid("Valid module ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    documentUrl: z.string().url("Please enter a valid URL"),
    fileType: z.string().min(1, "File type is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    sequenceNumber: z
        .number()
        .int("Sequence must be a whole number")
        .positive("Sequence must be positive")
});


// Assessment question schema
export const CreateQuestionSchema = z.object({
    assessmentId: z.string().uuid("Valid assessment ID is required"),
    questionText: z.string().min(5, "Question text must be at least 5 characters"),
    questionType: z.enum(['multiple_choice', 'true_false', 'text_response'], {
        errorMap: () => ({ message: "Question type must be multiple_choice, true_false, or text_response" })
    }),
    sequenceNumber: z.number().int("Sequence must be a whole number").positive("Sequence must be positive"),
    points: z.number().int("Points must be a whole number").min(1, "Points must be at least 1")
});

// Question option schema for multiple choice questions
export const CreateQuestionOptionSchema = z.object({
    questionId: z.string().uuid("Valid question ID is required"),
    optionText: z.string().min(1, "Option text is required"),
    isCorrect: z.boolean().default(false),
    sequenceNumber: z.number().int("Sequence must be a whole number").positive("Sequence must be positive")
});

// Types for frontend usage
export type Assessment = {
    id: string;
    module_id: string;
    title: string;
    description?: string;
    passing_score: number;
    time_limit_minutes?: number;
    sequence_number: number;
    created_by: string;
    created_at: string;
    updated_at: string;
    total_questions?: number;
};

export type AssessmentQuestion = {
    id: string;
    assessment_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'text_response';
    sequence_number: number;
    points: number;
    created_at: string;
    updated_at: string;
    options?: QuestionOption[];
};

export type QuestionOption = {
    id: string;
    question_id: string;
    option_text: string;
    is_correct: boolean;
    sequence_number: number;
    created_at: string;
    updated_at: string;
};

// Add this to your lib/validations.ts file

// Assessment creation schema
export const AssessmentSchema = z.object({
    moduleId: z.string().uuid("Valid module ID is required"),
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    instructions: z.string().optional(),
    passingScore: z.number().int().min(1, "Passing score must be at least 1"),
    timeLimitMinutes: z.number().int().positive().optional(),
    sequenceNumber: z.number().int().positive("Sequence number is required")
});

// Question creation schema
export const QuestionSchema = z.object({
    assessmentId: z.string().uuid("Valid assessment ID is required"),
    questionText: z.string().min(5, "Question text must be at least 5 characters"),
    questionType: z.enum(['multiple_choice', 'true_false', 'text_response'], {
        errorMap: () => ({ message: "Question type must be multiple_choice, true_false, or text_response" })
    }),
    sequenceNumber: z.number().int().positive("Sequence number is required"),
    points: z.number().int().min(1, "Points must be at least 1")
});

// Question option schema
export const OptionSchema = z.object({
    questionId: z.string().uuid("Valid question ID is required"),
    optionText: z.string().min(1, "Option text is required"),
    isCorrect: z.boolean().default(false),
    sequenceNumber: z.number().int().positive("Sequence number is required")
});


export interface AssessmentWithContent extends Assessment {
    content_item?: ContentItem;
    questions?: AssessmentQuestion[];
}


// Form option type (for client-side use)
export interface FormOption {
    id?: string;
    optionText: string;
    isCorrect: boolean;
    sequenceNumber: number;
}

