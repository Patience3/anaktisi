
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitMoodEntry, getMoodEntries } from "@/lib/actions/patient/mood";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Quote } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Motivational quotes for recovery
const recoveryQuotes = [
    "Recovery is not a race. You don't have to feel guilty if it takes you longer than you thought it would.",
    "Recovery is about progression, not perfection.",
    "The best time to plant a tree was 20 years ago. The second best time is now.",
    "You don't have to see the whole staircase, just take the first step.",
    "Rock bottom became the solid foundation on which I rebuilt my life.",
    "Every moment is a fresh beginning.",
    "Recovery is hard. Regret is harder.",
    "Your addiction is not your identity; it's a chapter in your story that doesn't define your future.",
    "Healing is a process, not an event. Give yourself the time you need.",
    "The first step towards getting somewhere is to decide that you are not going to stay where you are.",
    "Believe you can and you're halfway there.",
    "Sometimes the smallest step in the right direction ends up being the biggest step of your life.",
    "There are far better things ahead than any we leave behind.",
    "The hardest thing about addiction is that it doesn't kill you immediately. It kills you slowly, stealing pieces of your life along the way.",
    "You're not weak for having an addiction. It takes strength to face it and fight it every day."
];

// Mock questions for mood tracking
const moodQuestions = [
    "How are you feeling right now?",
    "What's your mood been like today?",
    "How would you describe your current emotional state?",
    "Has anything specific affected your mood today?",
    "How would you rate your stress level at this moment?",
    "Are you feeling more positive or negative today?",
    "How would you describe your energy level right now?",
    "Has your mood changed since the last time you checked in?",
    "What emotions are you experiencing most strongly right now?",
    "How would you describe your overall mental wellbeing today?"
];

// Mood types with corresponding emojis
const moodTypes = [
    { value: "happy", label: "Happy", emoji: "😊" },
    { value: "calm", label: "Calm", emoji: "😌" },
    { value: "neutral", label: "Neutral", emoji: "😐" },
    { value: "stressed", label: "Stressed", emoji: "😥" },
    { value: "sad", label: "Sad", emoji: "😢" },
    { value: "angry", label: "Angry", emoji: "😠" },
    { value: "anxious", label: "Anxious", emoji: "😰" }
];

export function MoodTracker() {
    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [moodScore, setMoodScore] = useState<number>(5);
    const [journalEntry, setJournalEntry] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState("");
    const [moodEntries, setMoodEntries] = useState<any[]>([]);
    const [isLoadingEntries, setIsLoadingEntries] = useState(true);
    const [currentQuote, setCurrentQuote] = useState("");
    const { toast } = useToast();
    const router = useRouter();

    // Load a random question initially and at intervals
    useEffect(() => {
        // Set initial random question
        setRandomQuestion();
        setRandomQuote();

        // Set up interval to change question every 5 minutes (300000ms)
        const intervalId = setInterval(() => {
            setRandomQuestion();
            setRandomQuote();
            // Also show a toast notification
            toast({
                title: "Time for a mood check!",
                description: "Please take a moment to record how you're feeling now."
            });
        }, 300000); // 5 minutes

        // Load past mood entries
        loadMoodEntries();

        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, []);

    const setRandomQuestion = () => {
        const randomIndex = Math.floor(Math.random() * moodQuestions.length);
        setCurrentQuestion(moodQuestions[randomIndex]);
    };

    const setRandomQuote = () => {
        const randomIndex = Math.floor(Math.random() * recoveryQuotes.length);
        setCurrentQuote(recoveryQuotes[randomIndex]);
    };

    const loadMoodEntries = async () => {
        setIsLoadingEntries(true);
        try {
            const response = await getMoodEntries(10);
            if (response.success) {
                setMoodEntries(response.data || []);
            } else {
                toast({
                    title: "Error",
                    description: response.error?.message || "Failed to load mood entries",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error loading mood entries:", error);
        } finally {
            setIsLoadingEntries(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedMood) {
            toast({
                title: "Selection required",
                description: "Please select a mood before submitting",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await submitMoodEntry(
                selectedMood,
                moodScore,
                journalEntry
            );

            if (response.success) {
                toast({
                    title: "Mood recorded",
                    description: "Thank you for sharing how you're feeling!"
                });

                // Reset form and set new question
                setSelectedMood(null);
                setMoodScore(5);
                setJournalEntry("");
                setRandomQuestion();
                setRandomQuote();

                // Reload entries
                loadMoodEntries();

                // Refresh the page data
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: response.error?.message || "Failed to record mood",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error submitting mood:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        }).format(date);
    };

    return (
        <Tabs defaultValue="track" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="track">Track Mood</TabsTrigger>
                <TabsTrigger value="history">Mood History</TabsTrigger>
            </TabsList>

            <TabsContent value="track" className="mt-6">
                {/* Daily Quote Card */}
                <Alert className="mb-6 bg-blue-50 border-blue-200">
                    <Quote className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-700">Daily Recovery Inspiration</AlertTitle>
                    <AlertDescription className="text-blue-600 italic">
                        &quot{currentQuote}&quot
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle>How Are You Feeling?</CardTitle>
                        <CardDescription>
                            {currentQuestion}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form id="mood-form" onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="mb-4 text-sm font-medium">Select the emoji that best represents your mood:</h3>
                                    <RadioGroup
                                        value={selectedMood || ""}
                                        onValueChange={setSelectedMood}
                                        className="grid grid-cols-4 sm:grid-cols-7 gap-2"
                                    >
                                        {moodTypes.map((mood) => (
                                            <div key={mood.value} className="flex flex-col items-center">
                                                <RadioGroupItem
                                                    value={mood.value}
                                                    id={`mood-${mood.value}`}
                                                    className="sr-only"
                                                />
                                                <Label
                                                    htmlFor={`mood-${mood.value}`}
                                                    className={`flex flex-col items-center justify-center p-2 rounded-md cursor-pointer transition-all ${
                                                        selectedMood === mood.value
                                                            ? "bg-blue-100 ring-2 ring-blue-500"
                                                            : "hover:bg-gray-100"
                                                    }`}
                                                >
                                                    <span className="text-3xl">{mood.emoji}</span>
                                                    <span className="text-xs mt-1">{mood.label}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div>
                                    <h3 className="mb-2 text-sm font-medium">How intense is this feeling? (1-10)</h3>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm">Mild</span>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={moodScore}
                                            onChange={(e) => setMoodScore(parseInt(e.target.value))}
                                            className="flex-1"
                                        />
                                        <span className="text-sm">Intense</span>
                                        <span className="ml-2 text-sm font-medium w-6 text-center">{moodScore}</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="mb-2 text-sm font-medium">Tell us more about how you&lsquore feeling (optional):</h3>
                                    <Textarea
                                        placeholder="Write about your thoughts, feelings, or what might be affecting your mood..."
                                        value={journalEntry}
                                        onChange={(e) => setJournalEntry(e.target.value)}
                                        className="min-h-[120px]"
                                    />
                                </div>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            form="mood-form"
                            disabled={isSubmitting || !selectedMood}
                            className="w-full"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Mood Entry"
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Your Mood History</CardTitle>
                        <CardDescription>
                            Review your recent mood entries and track patterns
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingEntries ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            </div>
                        ) : moodEntries.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground">
                                    You haven &lsquo t recorded any mood entries yet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {moodEntries.map((entry) => {
                                    const mood = moodTypes.find(m => m.value === entry.mood_type);
                                    return (
                                        <div key={entry.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">
                                                        {mood?.emoji || "😐"}
                                                    </span>
                                                    <div>
                                                        <h4 className="font-medium capitalize">{entry.mood_type}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Intensity: {entry.mood_score}/10
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(entry.entry_timestamp)}
                                                </span>
                                            </div>
                                            {entry.journal_entry && (
                                                <div className="mt-2 text-sm bg-gray-50 p-3 rounded-md">
                                                    {entry.journal_entry}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}