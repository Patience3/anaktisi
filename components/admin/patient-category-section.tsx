"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, BookOpen, ListPlus } from "lucide-react";
import { AssignCategoryModal } from "@/components/admin/assign-category-modal";
import { EnrollProgramsModal } from "@/components/admin/enroll-programs-modal";

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
        // Force a refresh to get the latest data
        router.refresh();
    };

    // Explicit check for null or undefined category
    if (!patient.category) {
        return (
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

    // If we get here, we have a category
    return (
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

                <div className="flex items-center gap-4 flex-wrap">
                    <Button variant="outline" size="sm" asChild>
                        <Link
                            href={`/admin/categories/${patient.category?.id}`}
                            className="flex items-center gap-2"
                        >
                            <BookOpen className="h-4 w-4" />
                            View Programs in Category
                        </Link>
                    </Button>

                    <EnrollProgramsModal
                        patientId={patient.id}
                        patientName={`${patient.first_name} ${patient.last_name}`}
                        categoryId={patient.category.id}
                        categoryName={patient.category.name}
                        onSuccess={handleSuccess}
                    >
                        <Button variant="secondary" size="sm" className="flex items-center gap-2">
                            <ListPlus className="h-4 w-4" />
                            Enroll in Programs
                        </Button>
                    </EnrollProgramsModal>

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
    );
}

// Import Link to fix the compilation error
import Link from "next/link";