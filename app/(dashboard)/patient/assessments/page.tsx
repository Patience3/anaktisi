// app/(dashboard)/patient/assessments/page.tsx
import { Metadata } from "next";
import FeatureComingSoon from "@/components/shared/FeatureComingSoon";

export const metadata: Metadata = {
    title: "Assessments | Patient Portal",
    description: "Take and review your treatment assessments",
};

export default function AssessmentsPage() {
    return (
        <FeatureComingSoon
            title="Assessments Feature Coming Soon"
            description="Our assessment system is being developed. Soon, you'll be able to take diagnostic assessments and track your progress over time."
            backUrl="/patient"
        />
    );
}