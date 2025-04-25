// components/patient/assessment/multiple-choice.tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface MultipleChoiceProps {
    question: any;
    selectedOptionId: string | undefined;
    onSelectOption: (optionId: string) => void;
}

export function MultipleChoiceQuestion({
                                           question,
                                           selectedOptionId,
                                           onSelectOption
                                       }: MultipleChoiceProps) {
    const options = question.options || [];

    return (
        <RadioGroup
            value={selectedOptionId}
            onValueChange={onSelectOption}
            className="space-y-3"
        >
            {options.map((option: any) => (
                <div
                    key={option.id}
                    className={`flex items-center space-x-2 p-3 rounded-md border ${
                        selectedOptionId === option.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                >
                    <RadioGroupItem
                        value={option.id}
                        id={option.id}
                        className="h-5 w-5"
                    />
                    <Label
                        htmlFor={option.id}
                        className="flex-grow cursor-pointer font-normal py-1"
                    >
                        {option.option_text}
                    </Label>
                </div>
            ))}
        </RadioGroup>
    );
}