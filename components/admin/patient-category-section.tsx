"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, BookOpen } from "lucide-react";
import { AssignCategoryModal } from "@/components/admin/assign-category-modal";

// Define proper types
interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    category?: {
        id: string;
        name: string;
    } | null;
}

interface CategoryInfo {
    id: string;
    name: string;
    description?: string;
}

interface PatientCategorySectionProps {
    patient: Patient;
    categories: CategoryInfo[];
}

export function PatientCategorySection({ patient, categories }: PatientCategorySectionProps) {
    const router = useRouter();

    const handleSuccess = () => {
        router.refresh();
    };

    return patient.category ? (
        <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                    Treatment Category
                </h3>

                <div className="flex items-center gap-2 mb-4">
                    <Tag className="h-5 w-5 text-blue-700" />
                    <div>
                        <p className="text-base font-medium text-blue-900">{patient.category.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" asChild>
                        <div
                            className="flex items-center gap-2"
                            onClick={() => window.location.href = `/admin/categories/${patient.category?.id}`}
                        >
                            <BookOpen className="h-4 w-4" />
                            View Programs in Category
                        </div>
                    </Button>

                    <AssignCategoryModal
                        patientId={patient.id}
                        patientName={`${patient.first_name} ${patient.last_name}`}
                        categories={categories}
                        currentCategoryId={patient.category.id}
                        onSuccess={handleSuccess}
                    >
                        <Button variant="ghost" size="sm">
                            Change Category
                        </Button>
                    </AssignCategoryModal>
                </div>
            </div>
        </div>
    ) : (
        <div className="p-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Treatment Category Assigned</h3>
            <p className="text-sm text-gray-500 mb-4">
                Assign this patient to a treatment category to better organize their care.
            </p>
            <AssignCategoryModal
                patientId={patient.id}
                patientName={`${patient.first_name} ${patient.last_name}`}
                categories={categories}
                onSuccess={handleSuccess}
            >
                <Button>
                    Assign to Category
                </Button>
            </AssignCategoryModal>
        </div>
    );
}