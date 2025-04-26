// components/admin/enrollment-chart.tsx
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EnrollmentData {
    date: string;
    [category: string]: string | number;
}

interface EnrollmentChartData {
    data: EnrollmentData[];
    categories: string[];
}

export function EnrollmentChart() {
    const [data, setData] = useState<EnrollmentChartData>({ data: [], categories: [] });
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState(30); // Default to 30 days
    const { toast } = useToast();

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(`/api/enrollment-data?days=${timeframe}`);
                const result = await response.json();

                if (result.success) {
                    setData(result.data || { data: [], categories: [] });
                } else {
                    toast({
                        title: "Error",
                        description: result.error?.message || "Failed to load enrollment data",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Error fetching enrollment data:", error);
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
    }, [timeframe, toast]);

    if (loading) {
        return <div className="h-80 bg-slate-100 rounded animate-pulse"></div>;
    }

    if (data.data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-muted-foreground">No enrollment data available for the selected period</p>
            </div>
        );
    }

    const colors = [
        "#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe",
        "#00C49F", "#FFBB28", "#FF8042", "#a4de6c", "#d0ed57"
    ];

    return (
        <div className="h-80">
            <div className="mb-4 flex justify-end gap-2">
                <button
                    onClick={() => setTimeframe(7)}
                    className={`px-2 py-1 text-xs rounded ${timeframe === 7 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                    7 Days
                </button>
                <button
                    onClick={() => setTimeframe(30)}
                    className={`px-2 py-1 text-xs rounded ${timeframe === 30 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                    30 Days
                </button>
                <button
                    onClick={() => setTimeframe(90)}
                    className={`px-2 py-1 text-xs rounded ${timeframe === 90 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                    90 Days
                </button>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data.data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {data.categories.map((category, index) => (
                        <Bar
                            key={category}
                            dataKey={category}
                            fill={colors[index % colors.length]}
                            name={category}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}