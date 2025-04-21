// app/(dashboard)/patient/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { Metadata } from "next";
import { getPatientCategory, getCategoryPrograms } from "@/lib/actions/patient/programs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getAuthUserSafe, getUserProfile } from "@/lib/auth-utils";
import {
    BookOpen, ArrowRight, CheckCircle, BarChart3, Calendar, Clock,
    Activity, Heart
} from "lucide-react";
import { PatientDashboardStats } from "@/components/patient/dashboard-stats";

export const metadata: Metadata = {
    title: "Dashboard | Patient Portal",
    description: "Your recovery journey dashboard",
};