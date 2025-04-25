// components/patient/assessment/text-response.tsx
import { Textarea } from "@/components/ui/textarea";

interface TextResponseProps {
    question: any;
    response: string;
    onResponseChange: (text: string) => void;
}

export function TextResponseQuestion({
                                         question,
                                         response,
                                         onResponseChange
                                     }: TextResponseProps) {
    return (
        <div className="space-y-2">
            <Textarea
                placeholder="Type your answer here..."
                className="min-h-[150px]"
                value={response}
                onChange={(e) => onResponseChange(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
                Please provide a detailed response. Your answer will be evaluated by your healthcare provider.
            </p>
        </div>
    );
}