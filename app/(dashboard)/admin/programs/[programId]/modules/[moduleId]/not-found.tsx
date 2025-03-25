
'use client'
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { useParams } from "next/navigation";

export default function ModuleNotFound() {
    // Get the programId from the URL to use in the back link
    const params = useParams<{ programId: string }>();
    const programId = params?.programId || "";

    return (
        <div className="container mx-auto flex flex-col items-center justify-center py-20">
            <div className="text-center">
                <div className="flex justify-center">
                    <div className="bg-red-50 rounded-full p-6 mb-6">
                        <FileQuestion className="h-20 w-20 text-red-500" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold mb-2">Module Not Found</h1>
                <p className="text-muted-foreground text-lg mb-8">
                    The module you are looking for does not exist or has been deleted.
                </p>
                <Button asChild>
                    <Link href={`/admin/programs/${programId}/modules`} className="flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Modules
                    </Link>
                </Button>
            </div>
        </div>
    );
}