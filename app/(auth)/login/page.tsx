"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signInWithCredentials } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Mail,
    Lock,
    AlertCircle,
    Loader2
} from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signInWithCredentials({
                email,
                password,
            });

            if (result.success && result.data) {
                const { role } = result.data;

                if (role === "admin") {
                    router.push("/admin");
                } else if (role === "patient") {
                    router.push("/patient");
                } else {
                    setError(`Unexpected role: ${role}`);
                }

                router.refresh();
            } else {
                setError(result.error?.message || "Authentication failed");
            }
        } catch (e) {
            setError("An unexpected error occurred during login");
            console.error("Login error:", e);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden">
            {/* Full-screen background image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/images/rehabilitation-illustration.png"

                    alt="Addiction treatment puzzle"
                    fill
                    priority
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-black/50"></div>
            </div>

            {/* Login form card overlay */}
            <div className="relative z-10 w-full max-w-md mx-auto px-4 mt-3">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden ">
                    {/* App logo/branding */}
                    <div className="pt-8 px-8 text-center">
                        <h1 className="text-3xl font-bold text-blue-600">Anaktisi</h1>
                        <p className="text-gray-600 mt-2">
                            Your pathway to recovery
                        </p>
                    </div>

                    {/* Login form */}
                    <div className="p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Welcome</h2>
                            <p className="text-gray-600 mt-1">Sign in to access your account</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="pl-10 border-gray-300 bg-white/80 focus:border-blue-500 focus:ring-blue-500 text-black"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                {/*<div className="flex items-center justify-between">*/}
                                {/*    <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>*/}
                                {/*    <a href="#" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">*/}
                                {/*        Forgot password?*/}
                                {/*    </a>*/}
                                {/*</div>*/}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 border-gray-300 bg-white/80 focus:border-blue-500 focus:ring-blue-500 text-black"
                                        required
                                    />
                                </div>
                            </div>



                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign in"
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Contact your administrator if you need assistance
                            </p>
                        </div>
                    </div>
                </div>

                <div className="my-3 text-center text-white text-sm">
                    <p>© {new Date().getFullYear()} Anaktisi. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}