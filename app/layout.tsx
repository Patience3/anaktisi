import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
 import "./globals.css";
import {Toaster} from "@/components/ui/sonner";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: 'Anaktisi | Rehabilitation Platform',
    description: 'A digital environment for rehabilitation therapists and patients on their pathway to recovery',
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased no-scrollbar`}
        >
        {children}

        <Toaster />
        </body>
        </html>
    );
}