"use client";

import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarFooter,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    Users,
    LineChart,
    Settings,
    Home,
    BookOpen,
    ClipboardCheck,
    HeartPulse,
    Menu,
    X,
    Activity,
    HelpCircle,
    LogOut,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

interface AppSidebarProps {
    userRole: "admin" | "patient";
    userName?: string;
}

const AppSidebar = ({ userRole, userName = "" }: AppSidebarProps) => {
    const pathname = usePathname();
    const { toggleSidebar, open, isMobile } = useSidebar();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [activeHref, setActiveHref] = useState("");

    // Update active link when pathname changes
    useEffect(() => {
        // Find the best matching link based on pathname
        const links = userRole === "admin" ? adminLinks : patientLinks;
        const matchedLink = links.find(link =>
            pathname === link.href ||
            (pathname.startsWith(`${link.href}/`) && link.href !== "/")
        );

        if (matchedLink) {
            setActiveHref(matchedLink.href);
        } else if (pathname === "/settings") {
            setActiveHref("/settings");
        } else if (pathname === "/help") {
            setActiveHref("/help");
        } else {
            setActiveHref("");
        }
    }, [pathname, userRole]);

    // Always show text labels on mobile regardless of open state
    const showLabels = open || isMobile;

    // Get user initials for avatar
    const initials = userName
        ? userName.split(' ').map(n => n[0]).join('').toUpperCase()
        : userRole === "admin" ? "A" : "P";

    // Define navigation links based on user role
    const adminLinks = [
        { icon: Home, label: "Dashboard", href: "/admin" },
        { icon: Users, label: "Patients", href: "/admin/patients" },
        { icon: BookOpen, label: "Programs", href: "/admin/programs" },
        { icon: Activity, label: "Progress", href: "/admin/progress" },
        { icon: LineChart, label: "Analytics", href: "/admin/analytics" },
    ];

    const patientLinks = [
        { icon: Home, label: "Dashboard", href: "/patient" },
        { icon: BookOpen, label: "My Programs", href: "/patient/programs" },
        { icon: ClipboardCheck, label: "Assessments", href: "/patient/assessments" },
        { icon: HeartPulse, label: "Mood Tracking", href: "/patient/mood" },
        { icon: Activity, label: "My Progress", href: "/patient/progress" },
    ];

    const navLinks = userRole === "admin" ? adminLinks : patientLinks;

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOut();
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <TooltipProvider>
            <Sidebar
                collapsible="icon"
                className="fixed left-0 bg-white shadow-md z-10 border-r border-gray-200"
                style={{
                    top: `${NAVBAR_HEIGHT}px`,
                    height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
                    position: 'fixed', // Ensure it's fixed
                    bottom: 0, // Ensure it extends to the bottom
                }}
            >
                <div className={cn(
                    "flex items-center mt-3 mb-2",
                    showLabels ? "px-3 justify-between" : "justify-center"
                )}>
                    {showLabels ? (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                                    {userRole === "admin" ? "A" : "P"}
                                </div>
                                <h1 className="text-sm font-semibold text-gray-800">
                                    {userRole === "admin" ? "Admin Portal" : "Patient Portal"}
                                </h1>
                            </div>
                            {!isMobile && (
                                <button
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                    onClick={() => toggleSidebar()}
                                    aria-label="Collapse sidebar"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                    onClick={() => toggleSidebar()}
                                    aria-label="Expand sidebar"
                                >
                                    <Menu className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                Expand sidebar
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>

                <SidebarContent className="px-2">
                    <SidebarMenu>
                        {navLinks.map((link) => {
                            // Check if this link is the active one
                            const isActive = activeHref === link.href;

                            // If sidebar is collapsed (no labels), wrap with Tooltip
                            if (!showLabels) {
                                return (
                                    <SidebarMenuItem key={link.href}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <SidebarMenuButton
                                                    asChild
                                                    className={cn(
                                                        "flex items-center rounded-md px-3 py-2 mb-0.5 transition-all justify-center",
                                                        isActive
                                                            ? "bg-blue-50 text-blue-700 font-medium"
                                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                                    )}
                                                >
                                                    <Link
                                                        href={link.href}
                                                        className="w-full"
                                                        onClick={() => setActiveHref(link.href)}
                                                    >
                                                        <div className="flex items-center justify-center">
                                                            <link.icon
                                                                className={cn(
                                                                    "h-5 w-5 flex-shrink-0",
                                                                    isActive ? "text-blue-600" : "text-gray-500"
                                                                )}
                                                            />
                                                        </div>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                {link.label}
                                            </TooltipContent>
                                        </Tooltip>
                                    </SidebarMenuItem>
                                );
                            }

                            // If sidebar is expanded, show normal view with labels
                            return (
                                <SidebarMenuItem key={link.href}>
                                    <SidebarMenuButton
                                        asChild
                                        className={cn(
                                            "flex items-center rounded-md px-3 py-2 mb-0.5 transition-all justify-start",
                                            isActive
                                                ? "bg-blue-50 text-blue-700 font-medium"
                                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                        )}
                                    >
                                        <Link
                                            href={link.href}
                                            className="w-full"
                                            onClick={() => setActiveHref(link.href)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <link.icon
                                                    className={cn(
                                                        "h-5 w-5 flex-shrink-0",
                                                        isActive ? "text-blue-600" : "text-gray-500"
                                                    )}
                                                />
                                                <span className={cn(
                                                    isActive ? "text-blue-700" : "text-gray-700"
                                                )}>
                                                    {link.label}
                                                </span>
                                            </div>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>

                </SidebarContent>


            </Sidebar>
        </TooltipProvider>
    );
};

export default AppSidebar;