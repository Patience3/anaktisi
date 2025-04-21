// components/shared/FeatureComingSoon.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Construction } from "lucide-react";

interface FeatureComingSoonProps {
    title: string;
    description?: string;
    backUrl: string;
    backLabel?: string;
}

export default function FeatureComingSoon({
                                              title,
                                              description = "This feature is currently under development and will be available soon.",
                                              backUrl,
                                              backLabel = "Back to Dashboard"
                                          }: FeatureComingSoonProps) {
    return (
        <div className="container mx-auto py-12">
            <div className="flex flex-col items-center justify-center gap-6 text-center">
                <div className="bg-amber-100 p-4 rounded-full">
                    <Construction className="h-12 w-12 text-amber-600" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        {description}
                    </p>
                </div>

                <Button asChild variant="outline" className="mt-2">
                    <Link href={backUrl}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backLabel}
                    </Link>
                </Button>
            </div>
        </div>
    );
}