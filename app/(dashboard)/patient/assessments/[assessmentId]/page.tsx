// app/(dashboard)/patient/assessments/[assessmentId]/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FeatureComingSoon from "@/components/shared/FeatureComingSoon";

interface AssessmentViewPageProps {
    params: {
        assessmentId: string;
    };
}

export const metadata: Metadata = {
    title: "Assessment | Patient Portal",
    description: "Take your assessment",
};

export default function AssessmentViewPage({ params }: AssessmentViewPageProps) {
    const { assessmentId } = params;

    // This page is currently not implemented
    return (
        <FeatureComingSoon
            title="Assessments Coming Soon"
            description="Our assessment system is being developed. You'll soon be able to take this assessment and track your progress."
            backUrl="/patient"
        />
    );
}