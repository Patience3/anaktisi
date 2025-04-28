// lib/actions/admin/dashboard.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth-utils";
import { handleServerError } from "@/lib/handlers/error";

interface DashboardStats {
    totalPatients: number;
    activePatients: number;
    activePrograms: number;
    totalModules: number;
    totalEnrollments: number;
    completedEnrollments: number;
    completedAssessments: number;
    assessmentCompletionRate: number;
}

interface CategoryStat {
    id: string;
    name: string;
    patientCount: number;
}

interface EnrollmentDataPoint {
    date: string;
    [category: string]: string | number;
}

interface EnrollmentData {
    data: EnrollmentDataPoint[];
    categories: string[];
}

interface RecentPatient {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: string;
    category: string | null;
}

/**
 * Get dashboard statistics for the admin dashboard
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        await requireAdmin();
        const supabase = await createClient();

        const { count: totalPatients, error: patientsError } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "patient");
        if (patientsError) throw patientsError;

        const { count: activePatients, error: activePatientsError } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "patient")
            .eq("is_active", true);
        if (activePatientsError) throw activePatientsError;

        const { count: activePrograms, error: programsError } = await supabase
            .from("treatment_programs")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true);
        if (programsError) throw programsError;

        const { count: totalModules, error: modulesError } = await supabase
            .from("learning_modules")
            .select("*", { count: "exact", head: true });
        if (modulesError) throw modulesError;

        const { count: totalEnrollments, error: enrollmentsError } = await supabase
            .from("patient_enrollments")
            .select("*", { count: "exact", head: true });
        if (enrollmentsError) throw enrollmentsError;

        const { count: completedEnrollments, error: completedEnrollmentsError } = await supabase
            .from("patient_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("status", "completed");
        if (completedEnrollmentsError) throw completedEnrollmentsError;

        const { count: totalAttempts, error: attemptsError } = await supabase
            .from("patient_assessment_attempts")
            .select("*", { count: "exact", head: true });
        if (attemptsError) throw attemptsError;

        const { count: completedAssessments, error: completedAssessmentsError } = await supabase
            .from("patient_assessment_attempts")
            .select("*", { count: "exact", head: true })
            .not("completed_at", "is", null);
        if (completedAssessmentsError) throw completedAssessmentsError;

        // @ts-ignore
        const assessmentCompletionRate = totalAttempts > 0
            ? Math.round((completedAssessments / totalAttempts) * 100)
            : 0;

        return {
            totalPatients: totalPatients || 0,
            activePatients: activePatients || 0,
            activePrograms: activePrograms || 0,
            totalModules: totalModules || 0,
            totalEnrollments: totalEnrollments || 0,
            completedEnrollments: completedEnrollments || 0,
            completedAssessments: completedAssessments || 0,
            assessmentCompletionRate
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return {
            totalPatients: 0,
            activePatients: 0,
            activePrograms: 0,
            totalModules: 0,
            totalEnrollments: 0,
            completedEnrollments: 0,
            completedAssessments: 0,
            assessmentCompletionRate: 0
        };
    }
}

/**
 * Get recent patients for the dashboard
 */
export async function getRecentPatients(limit = 5): Promise<ActionResponse<RecentPatient[]>> {
    try {
        await requireAdmin();
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("users")
            .select(`
                id,
                first_name,
                last_name,
                email,
                is_active,
                created_at,
                patient_categories(
                  category_id,
                  program_categories(name)
                )
            `)
            .eq("role", "patient")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw error;

        const formattedPatients: RecentPatient[] = data.map(patient => {
            let categoryName = null;
            if (patient.patient_categories && patient.patient_categories.length > 0) {
                const category = patient.patient_categories[0];
                categoryName = category.program_categories?.name || null;
            }

            return {
                id: patient.id,
                name: `${patient.first_name} ${patient.last_name}`,
                email: patient.email,
                isActive: patient.is_active,
                createdAt: patient.created_at,
                category: categoryName
            };
        });

        return { success: true, data: formattedPatients };
    } catch (error) {
        console.error("Error fetching recent patients:", error);
        return handleServerError(error);
    }
}

/**
 * Get enrollment statistics by category
 */
export async function getCategoryStats(): Promise<ActionResponse<CategoryStat[]>> {
    try {
        await requireAdmin();
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("program_categories")
            .select(`
                id,
                name,
                patient_categories!inner(patient_id)
            `);

        if (error) throw error;

        const categoryStats: CategoryStat[] = data.map(category => ({
            id: category.id,
            name: category.name,
            patientCount: category.patient_categories.length
        }));

        return { success: true, data: categoryStats };
    } catch (error) {
        console.error("Error fetching category stats:", error);
        return handleServerError(error);
    }
}

/**
 * Get enrollment data over time
 */
export async function getEnrollmentData(days = 30): Promise<ActionResponse<EnrollmentData>> {
    try {
        await requireAdmin();
        const supabase = await createClient();

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();

        const { data, error } = await supabase
            .from("patient_enrollments")
            .select(`
                id,
                created_at,
                program_id,
                treatment_programs(
                  category_id,
                  program_categories(name)
                )
            `)
            .gte("created_at", startDateStr)
            .lte("created_at", endDateStr)
            .order("created_at");

        if (error) throw error;

        const enrollmentsByDay: Record<string, Record<string, number>> = {};
        const categories = new Set<string>();

        data.forEach(enrollment => {
            const date = new Date(enrollment.created_at).toISOString().split('T')[0];
            const categoryName = enrollment.treatment_programs?.program_categories?.name || "Uncategorized";
            categories.add(categoryName);

            if (!enrollmentsByDay[date]) {
                enrollmentsByDay[date] = {};
            }

            if (!enrollmentsByDay[date][categoryName]) {
                enrollmentsByDay[date][categoryName] = 0;
            }

            enrollmentsByDay[date][categoryName]++;
        });

        const chartData: EnrollmentDataPoint[] = Object.keys(enrollmentsByDay).map(date => {
            const entry: EnrollmentDataPoint = { date };
            categories.forEach(category => {
                entry[category] = enrollmentsByDay[date][category] || 0;
            });
            return entry;
        });

        return {
            success: true,
            data: {
                data: chartData,
                categories: Array.from(categories)
            }
        };
    } catch (error) {
        console.error("Error fetching enrollment data:", error);
        return handleServerError(error);
    }
}
