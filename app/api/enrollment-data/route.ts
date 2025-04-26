// app/api/enrollment-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEnrollmentData } from "@/lib/actions/admin/dashboard";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    try {
        // Auth check - fixed to use correct server client pattern
        const cookieStore = cookies();
        const supabase = await createClient(); // Use 'await' here

        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user) {
            return NextResponse.json(
                { success: false, error: { message: "Unauthorized" } },
                { status: 401 }
            );
        }

        // Get user role
        const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || profile.role !== "admin") {
            return NextResponse.json(
                { success: false, error: { message: "Unauthorized - Admin access required" } },
                { status: 403 }
            );
        }

        // Get days parameter from query (default: 30 days)
        const days = request.nextUrl.searchParams.get("days");
        const daysInt = days ? parseInt(days) : 30;

        // Get enrollment data
        const enrollmentData = await getEnrollmentData(daysInt);

        return NextResponse.json({ success: true, data: enrollmentData.data });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: { message: "Failed to retrieve enrollment data" }
            },
            { status: 500 }
        );
    }
}