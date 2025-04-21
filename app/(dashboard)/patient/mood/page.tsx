// app/(dashboard)/patient/mood/page.tsx
import { Metadata } from "next";
import { MoodTracker } from "@/components/patient/mood-tracker";

export const metadata: Metadata = {
    title: "Mood Tracking | Patient Portal",
    description: "Track your mood and emotions over time",
};

export default function MoodTrackingPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-2 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Mood Tracking</h1>
                <p className="text-muted-foreground">
                    Record how you're feeling and track your emotional patterns over time
                </p>
            </div>

            <MoodTracker />
        </div>
    );
}