"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NAVBAR_HEIGHT } from "@/lib/constants";
import { useSidebar } from "@/components/ui/sidebar";
import {Menu, Bell, Search, UserCircle, LogOut, Settings} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/actions/auth";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
    userRole?: 'admin' | 'patient';
    userName?: string;
}

export function Navbar({ userRole, userName }: NavbarProps) {
    const { toggleSidebar, isMobile } = useSidebar();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const initials = userName
        ? userName.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U';

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
        <header
            className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-20 "
            style={{ height: `${NAVBAR_HEIGHT}px` }}
        >
            <div className="px-4 h-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-gray-500 hover:bg-gray-100"
                        onClick={() => toggleSidebar()}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex items-center">
                        <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold mr-2.5">
                            A
                        </div>
                        <h1 className="font-semibold text-lg text-gray-800">
                            Anaktisi
                        </h1>
                    </div>
                </div>

                {/* Search bar - hidden on mobile */}
                <div className="hidden md:flex relative w-full max-w-md mx-4">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full h-9 pl-9 pr-4 rounded-md border border-gray-300 bg-gray-50 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <Search className="absolute left-2.5 top-2 h-4.5 w-4.5 text-gray-400" />
                    </div>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-3">
                    {/* Notifications dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full relative"
                            >
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <div className="py-2 px-1 text-sm text-gray-500 text-center">
                                You have no new notifications
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* User dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-gray-100 rounded-full p-1 transition-colors">
                                <Avatar className="h-8 w-8 bg-blue-100 border border-gray-200">
                                    <AvatarFallback className="text-blue-700 font-medium text-sm">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium text-gray-700 hidden lg:inline mr-1">
                                    {userName}
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col">
                                    <span>{userName}</span>
                                    <span className="text-xs text-gray-500 mt-1 capitalize">
                                        {userRole} Account
                                    </span>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/profile')}>
                                <UserCircle className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/settings')}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/settings')}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Help</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="text-red-600 focus:text-red-600"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}