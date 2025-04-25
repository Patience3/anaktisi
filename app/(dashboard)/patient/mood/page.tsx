// app/(dashboard)/patient/mood/page.tsx
import { Metadata } from "next";
import { MoodTracker } from "@/components/patient/mood-tracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

            <div className="grid grid-cols-1 gap-6">
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Why Track Your Mood?</CardTitle>
                        <CardDescription>
                            Understanding your emotional patterns helps with recovery
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700">
                            Regular mood tracking helps you become more aware of your emotional patterns and triggers.
                            This awareness is a key part of your treatment journey, allowing you to:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
                            <li>Identify patterns in how your emotions change over time</li>
                            <li>Recognize potential triggers for negative emotions</li>
                            <li>Track your progress throughout your treatment program</li>
                            <li>Provide valuable information for your healthcare provider</li>
                        </ul>
                    </CardContent>
                </Card>

                <MoodTracker />
            </div>
        </div>
    );
}