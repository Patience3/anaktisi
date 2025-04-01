// components/admin/question-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createQuestion, updateQuestion, getNextQuestionSequence } from "@/lib/actions/admin/assessment";
import { QuestionSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

// Define interfaces for strongly typed question data
interface QuestionData {
    id: string;
    assessment_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'text_response';
    sequence_number: number;
    points: number;
    created_at: string;
    updated_at: string;
    options?: OptionData[];
}

interface OptionData {
    id: string;
    question_id: string;
    option_text: string;
    is_correct: boolean;
    sequence_number: number;
}

interface FormOption {
    id?: string;
    optionText: string;
    isCorrect: boolean;
    sequenceNumber: number;
}

// Infer the type from the Zod schema
type QuestionFormValues = z.infer<typeof QuestionSchema> & {
    options?: FormOption[];
};

interface QuestionFormProps {
    assessmentId: string;
    onSuccess: (questionId: string) => void;
    question?: QuestionData;
}

export function QuestionForm({ assessmentId, onSuccess, question }: QuestionFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingNextSequence, setIsLoadingNextSequence] = useState(!question);
    const [questionType, setQuestionType] = useState<string>(question?.question_type || 'multiple_choice');
    const [options, setOptions] = useState<FormOption[]>(
        question?.options?.map(opt => ({
            id: opt.id,
            optionText: opt.option_text,
            isCorrect: opt.is_correct,
            sequenceNumber: opt.sequence_number
        })) || [
            { optionText: '', isCorrect: false, sequenceNumber: 1 },
            { optionText: '', isCorrect: false, sequenceNumber: 2 }
        ]
    );

    const isEditMode = !!question;

    // Initialize React Hook Form with Zod resolver
    const form = useForm<QuestionFormValues>({
        resolver: zodResolver(QuestionSchema),
        defaultValues: {
            assessmentId: assessmentId,
            questionText: question?.question_text || "",
            questionType: question?.question_type || "multiple_choice",
            sequenceNumber: question?.sequence_number || 0,
            points: question?.points || 1,
        },
    });

    // Update the options when question type changes
    useEffect(() => {
        const subscription = form.watch((value, { name }) => {
            if (name === 'questionType') {
                const newType = value.questionType as string;
                setQuestionType(newType);

                if (newType === 'true_false' && (!options.length || options.length > 2)) {
                    setOptions([
                        { optionText: 'True', isCorrect: false, sequenceNumber: 1 },
                        { optionText: 'False', isCorrect: false, sequenceNumber: 2 }
                    ]);
                } else if (newType === 'multiple_choice' && !options.length) {
                    setOptions([
                        { optionText: '', isCorrect: false, sequenceNumber: 1 },
                        { optionText: '', isCorrect: false, sequenceNumber: 2 }
                    ]);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [form, options]);

    // Fetch next sequence number on component mount if creating new question
    useEffect(() => {
        if (!isEditMode) {
            async function fetchNextSequence() {
                try {
                    const result = await getNextQuestionSequence(assessmentId);
                    if (result.success && result.data !== undefined) {
                        form.setValue("sequenceNumber", result.data as number);
                    }
                } catch (e) {
                    console.error("Failed to get next sequence number:", e);
                    // Default to 1 if we can't fetch
                    form.setValue("sequenceNumber", 1);
                } finally {
                    setIsLoadingNextSequence(false);
                }
            }

            fetchNextSequence();
        } else {
            setIsLoadingNextSequence(false);
        }
    }, [form, isEditMode, assessmentId]);

    function addOption() {
        const newSeq = options.length > 0 ? Math.max(...options.map(o => o.sequenceNumber)) + 1 : 1;
        setOptions([...options, { optionText: '', isCorrect: false, sequenceNumber: newSeq }]);
    }

    function removeOption(index: number) {
        if (options.length <= 2 && questionType === 'multiple_choice') {
            setError("Multiple choice questions must have at least 2 options");
            return;
        }

        if (questionType === 'true_false') {
            setError("Cannot remove options from True/False questions");
            return;
        }

        const newOptions = [...options];
        newOptions.splice(index, 1);
        setOptions(newOptions);
    }

    function updateOption(index: number, field: keyof FormOption, value: string | boolean | number) {
        const newOptions = [...options];
        newOptions[index] = { ...newOptions[index], [field]: value };

        // If making an option correct, ensure it's the only correct one for single-answer questions
        if (field === 'isCorrect' && value === true && questionType !== 'multiple_choice') {
            newOptions.forEach((opt, i) => {
                if (i !== index) {
                    opt.isCorrect = false;
                }
            });
        }

        setOptions(newOptions);
    }

    async function onSubmit(data: QuestionFormValues) {
        setIsLoading(true);
        setError(null);

        // Validate options based on question type
        if (data.questionType === 'multiple_choice' || data.questionType === 'true_false') {
            if (!options.length) {
                setError(`${data.questionType === 'multiple_choice' ? 'Multiple choice' : 'True/False'} questions require options`);
                setIsLoading(false);
                return;
            }

            if (!options.some(opt => opt.isCorrect)) {
                setError("At least one option must be marked as correct");
                setIsLoading(false);
                return;
            }

            if (options.some(opt => !opt.optionText.trim())) {
                setError("All options must have text");
                setIsLoading(false);
                return;
            }
        }

        try {
            let result;

            const questionData = {
                ...data,
                options: options
            };

            if (isEditMode && question) {
                // Update existing question
                result = await updateQuestion(question.id, questionData);
            } else {
                // Create new question
                result = await createQuestion(questionData);
            }

            if (result.success && result.data) {
                if (!isEditMode) {
                    form.reset(); // Reset form on success for creation
                    setOptions([
                        { optionText: '', isCorrect: false, sequenceNumber: 1 },
                        { optionText: '', isCorrect: false, sequenceNumber: 2 }
                    ]);
                }
                onSuccess(result.data.id);
            } else {
                setError(result.error?.message || "Failed to save question");

                // Handle validation errors from server
                if (result.error?.details) {
                    // Set field errors from server response
                    Object.entries(result.error.details).forEach(([field, messages]) => {
                        form.setError(field as never, {
                            type: "server",
                            message: messages[0],
                        });
                    });
                }
            }
        } catch (e) {
            setError("An unexpected error occurred");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoadingNextSequence) {
        return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <Form {...form}>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="questionText"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Question Text</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter your question here..."
                                    className="min-h-[100px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                The text of the question to be presented to the user
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="questionType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Question Type</FormLabel>
                            <Select
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    setQuestionType(value);
                                }}
                                defaultValue={field.value}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select question type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                    <SelectItem value="true_false">True/False</SelectItem>
                                    <SelectItem value="text_response">Text Response</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>
                                The type of question determines how it will be answered
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {(questionType === 'multiple_choice' || questionType === 'true_false') && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium">Options</h3>
                            {questionType === 'multiple_choice' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addOption}
                                >
                                    Add Option
                                </Button>
                            )}
                        </div>

                        {options.map((option, index) => (
                            <div key={index} className="flex items-start gap-2 bg-slate-50 p-3 rounded-md">
                                <Checkbox
                                    id={`option-${index}-correct`}
                                    checked={option.isCorrect}
                                    onCheckedChange={(checked) => updateOption(index, 'isCorrect', !!checked)}
                                    className="mt-1"
                                />
                                <div className="flex-grow">
                                    <Input
                                        value={option.optionText}
                                        onChange={(e) => updateOption(index, 'optionText', e.target.value)}
                                        placeholder="Option text"
                                        disabled={questionType === 'true_false'}
                                    />
                                </div>
                                {questionType === 'multiple_choice' && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOption(index)}
                                        className="text-destructive"
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="points"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Points</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="Point value"
                                        value={field.value || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? undefined : parseInt(value, 10));
                                        }}
                                        onBlur={field.onBlur}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Points awarded for a correct answer
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="sequenceNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sequence Number</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="Question order"
                                        value={field.value || ""}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === "" ? undefined : parseInt(value, 10));
                                        }}
                                        onBlur={field.onBlur}
                                    />
                                </FormControl>
                                <FormDescription>
                                    The order of this question in the assessment
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Hidden field for assessmentId */}
                <input type="hidden" {...form.register("assessmentId")} />

                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading || form.formState.isSubmitting}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isEditMode ? "Updating..." : "Creating..."}
                            </>
                        ) : (
                            isEditMode ? "Update Question" : "Create Question"
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
}