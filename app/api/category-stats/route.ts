// app/api/admin/category-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCategoryStats } from "@/lib/actions/admin/dashboard";
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

        // Get category statistics
        const data = await getCategoryStats();

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: { message: "Failed to retrieve category statistics" }
            },
            { status: 500 }
        );
    }
}