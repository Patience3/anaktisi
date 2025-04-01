// app/(dashboard)/admin/programs/[programId]/modules/[moduleId]/content/assessment/[assessmentId]/page.tsx
import { getAssessmentById } from "@/lib/actions/admin/assessment";
import { requireAdmin } from "@/lib/auth-utils";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Clock, FileText, PlusCircle } from "lucide-react";
import Link from "next/link";
import { DeleteAssessmentButton } from "@/components/admin/delete-assessment-button";
import { Separator } from "@/components/ui/separator";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/shared/table-skeleton";

// Define interfaces for the assessment data structure
interface AssessmentWithContent {
    id: string;
    content_item_id: string;
    title: string;
    description: string;
    passing_score: number;
    time_limit_minutes: number | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    content_item?: {
        id: string;
        module_id: string;
        title: string;
        content_type: string;
        content: string;
        sequence_number: number;
        created_by: string;
        created_at: string;
        updated_at: string;
    };
    questions?: AssessmentQuestion[];
}

interface AssessmentQuestion {
    id: string;
    assessment_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'text_response';
    sequence_number: number;
    points: number;
    created_at: string;
    updated_at: string;
    options?: QuestionOption[];
}

interface QuestionOption {
    id: string;
    question_id: string;
    option_text: string;
    is_correct: boolean;
    sequence_number: number;
    created_at: string;
    updated_at: string;
}

interface ContentData {
    description: string;
    instructions: string;
}

interface AssessmentDetailsProps {
    params: {
        programId: string;
        moduleId: string;
        assessmentId: string;
    };
}

// Generate metadata for the page
export async function generateMetadata({ params }: AssessmentDetailsProps): Promise<Metadata> {
    const response = await getAssessmentById(params.assessmentId);

    if (!response.success || !response.data) {
        return {
            title: "Assessment Details - Not Found",
        };
    }

    return {
        title: `Assessment Details - ${response.data.title}`,
    };
}

export default async function AssessmentDetails({ params }: AssessmentDetailsProps) {
    // Check authorization
    await requireAdmin();

    // Fetch assessment data
    const response = await getAssessmentById(params.assessmentId);

    // Handle not found
    if (!response.success || !response.data) {
        notFound();
    }

    const assessment = response.data as AssessmentWithContent;
    const createdAt = new Date(assessment.create