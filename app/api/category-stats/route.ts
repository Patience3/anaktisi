// app/api/category-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCategoryStats } from "@/lib/actions/admin/dashboard";
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

        // Get category statistics
        const categoryStats = await getCategoryStats();

        return NextResponse.json({ success: true, data: categoryStats.data });
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