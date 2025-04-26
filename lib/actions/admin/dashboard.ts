// lib/actions/admin/dashboard.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth-utils";

/**
 * Get dashboard statistics for the admin dashboard
 */
export async function getDashboardStats() {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get total and active patients
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

        // Get active programs
        const { count: activePrograms, error: programsError } = await supabase
            .from("treatment_programs")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true);

        if (programsError) throw programsError;

        // Get total modules
        const { count: totalModules, error: modulesError } = await supabase
            .from("learning_modules")
            .select("*", { count: "exact", head: true });

        if (modulesError) throw modulesError;

        // Get enrollment statistics
        const { count: totalEnrollments, error: enrollmentsError } = await supabase
            .from("patient_enrollments")
            .select("*", { count: "exact", head: true });

        if (enrollmentsError) throw enrollmentsError;

        const { count: completedEnrollments, error: completedEnrollmentsError } = await supabase
            .from("patient_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("status", "completed");

        if (completedEnrollmentsError) throw completedEnrollmentsError;

        // Get assessment statistics
        const { count: totalAttempts, error: attemptsError } = await supabase
            .from("patient_assessment_attempts")
            .select("*", { count: "exact", head: true });

        if (attemptsError) throw attemptsError;

        const { count: completedAssessments, error: completedAssessmentsError } = await supabase
            .from("patient_assessment_attempts")
            .select("*", { count: "exact", head: true })
            .not("completed_at", "is", null);

        if (completedAssessmentsError) throw completedAssessmentsError;

        // Calculate assessment completion rate
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
            assessmentCompletionRate: assessmentCompletionRate
        };
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Return default values if there's an error
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
export async function getRecentPatients(limit = 5) {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get recent patients with their category
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

        // Format the response to include category name
        return data.map(patient => {
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
    } catch (error) {
        console.error("Error fetching recent patients:", error);
        return [];
    }
}

/**
 * Get enrollment statistics by category
 */
export async function getCategoryStats() {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Get categories with patient counts
        const { data, error } = await supabase
            .from("program_categories")
            .select(`
        id,
        name,
        patient_categories!inner(patient_id)
      `);

        if (error) throw error;

        // Count patients in each category
        const categoryStats = data.map(category => ({
            id: category.id,
            name: category.name,
            patientCount: category.patient_categories.length
        }));

        return categoryStats;
    } catch (error) {
        console.error("Error fetching category stats:", error);
        return [];
    }
}

/**
 * Get enrollment data over time
 */
export async function getEnrollmentData(days = 30) {
    try {
        // Ensure the user is an admin
        await requireAdmin();

        const supabase = await createClient();

        // Calculate the date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // Format dates for the database query
        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();

        // Get enrollments in the date range
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

        // Process the data for the chart
        // Group by day and category
        const enrollmentsByDay = {};
        const categories = new Set();

        data.forEach(enrollment => {
            // Format date as YYYY-MM-DD
            const date = new Date(enrollment.created_at).toISOString().split('T')[0];

            // Get category name
            const categoryName = enrollment.treatment_programs?.program_categories?.name || "Uncategorized";
            categories.add(categoryName);

            // Initialize the day if it doesn't exist
            if (!enrollmentsByDay[date]) {
                enrollmentsByDay[date] = {};
            }

            // Increment the count for this category on this day
            if (!enrollmentsByDay[date][categoryName]) {
                enrollmentsByDay[date][categoryName] = 0;
            }
            enrollmentsByDay[date][categoryName]++;
        });

        // Convert to chart data format
        const chartData = Object.keys(enrollmentsByDay).map(date => {
            const entry = { date };
            categories.forEach(category => {
                entry[category] = enrollmentsByDay[date][category] || 0;
            });
            return entry;
        });

        return {
            data: chartData,
            categories: Array.from(categories)
        };
    } catch (error) {
        console.error("Error fetching enrollment data:", error);
        return {
            data: [],
            categories: []
        };
    }
}