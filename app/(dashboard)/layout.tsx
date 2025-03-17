"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
 import { SidebarProvider } from "@/components/ui/sidebar";
import { Navbar } from "@/components/Navigation/navbar";
import AppSidebar from "@/components/AppSidebar";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { getUser } from "@/lib/auth-utils";

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    // State to store user profile data
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchUserData() {
            try {
                // Call the getUser function (this is client-side now)
                const { user, profile } = await getUser();

                if (!profile) {
                    // Redirect if no profile found
                    router.push("/login");
                    return;
                }

                setUserProfile(profile);
            } catch (error) {
                console.error("Error fetching user:", error);
                // Redirect to login on error
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }

        fetchUserData();
    }, [router]);

    // Show loading state while checking authentication
    if (loading) {
        return <LoadingScreen />;
    }

    // Safety check - this should never happen due to the redirect above
    if (!userProfile) {
        return null;
    }

    const userRole = userProfile.role as "admin" | "patient";
    const userName = `${userProfile.first_name} ${userProfile.last_name}`;

    // Get cookie value for sidebar state
    const defaultOpen = typeof document !== 'undefined'
        ? document.cookie.includes("sidebar_state=true")
        : true;

    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <div className="min-h-screen w-full bg-gray-50">
                <Navbar userRole={userRole} userName={userName} />
                <div className="mt-6">
                    <main className="flex">
                        <AppSidebar userRole={userRole} userName={userName} />
                        <div
                            className="flex flex-1 flex-col p-6 mt-15 md:p-6 transition-all duration-300"
                        >
                            <div className=" mx-auto w-full max-w-7xl">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}