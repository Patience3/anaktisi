"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export default function LogoutButton() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    async function handleLogout() {
        setIsLoading(true);

        try {
            const result = await signOut();

            if (result.success) {
                // Client-side navigation to login page
                router.push("/login");
                router.refresh();
            } else {
                console.error("Logout failed:", result.error?.message);
            }
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoading}
        >
            {isLoading ? "Signing out..." : "Sign out"}
        </Button>
    );
}