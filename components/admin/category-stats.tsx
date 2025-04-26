// components/admin/category-stats.tsx
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Pie } from "recharts";

interface CategoryStat {
    id: string;
    name: string;
    patientCount: number;
}

export function AdminCategoryStats() {
    const [data, setData] = useState<CategoryStat[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/api/category-stats');
                const result = await response.json();

                if (result.success) {
                    setData(result.data || []);
                } else {
                    toast({
                        title: "Error",
                        description: result.error?.message || "Failed to load category statistics",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Error fetching category stats:", error);
                toast({
                    title: "Error",
                    description: "An unexpected error occurred",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [toast]);

    if (loading) {
        return <div className="h-80 bg-slate-100 rounded animate-pulse"></div>;
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-muted-foreground">No category data available</p>
            </div>
        );
    }

    // Prepare data for the chart
    const chartData = data.map(category => ({
        name: category.name,
        value: category.patientCount,
        fill: getRandomColor(category.id),
    }));

    return (
        <div className="h-80 flex items-center justify-center">
            <div className="w-full h-full flex flex-col items-center">
                <div className="w-full h-64">
                    <Pie data={chartData} dataKey="value" nameKey="name"
                         cx="50%" cy="50%" outerRadius={80} label />
                </div>
                <div className="mt-4 space-y-2">
                    {chartData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                            <span className="text-sm">{entry.name}: {entry.value} patients</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Generate a color based on the ID
function getRandomColor(id: string): string {
    // Use the id to create a deterministic color
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
}