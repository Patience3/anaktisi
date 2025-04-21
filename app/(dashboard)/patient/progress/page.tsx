// app/(dashboard)/patient/progress/page.tsx
import { Metadata } from "next";
import FeatureComingSoon from "@/components/shared/FeatureComingSoon";

export const metadata: Metadata = {
    title: "My Progress | Patient Portal",
    description: "Track your recovery journey progress",
};

export default function ProgressPage() {
    return (
        <FeatureComingSoon
            title="Progress Tracking Coming Soon"
            description="Our progress tracking system is being developed. Soon, you'll be able to visualize your recovery journey with detailed charts and progress indicators."
            backUrl="/patient"
        />
    );
}