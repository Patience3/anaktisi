// app/api/admin/enrollment-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEnrollmentData } from "@/lib/actions/admin/dashboard";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
    try {
        // Auth check
        const cookieStore = cookies();
        const supabase = createClient();

        const { data: { user } } = await supabase.auth.getUser();

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
        const data = await getEnrollmentData(daysInt);

        return NextResponse.json({ success: true, data });
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