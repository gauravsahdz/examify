
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select"; // Import CustomSelect
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, ClipboardCopy, Check, AlertTriangle, Lock } from "lucide-react"; // Added Lock
import { useToast } from "@/hooks/use-toast";
import { generateQuestions, type GenerateQuestionsOutput } from '@/ai/flows/generate-questions';
import { QuestionDifficulty } from '@/lib/enums';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext'; // Import useAuth


const formSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
  difficulty: z.nativeEnum(QuestionDifficulty),
  numberOfQuestions: z.coerce.number().int().min(1, {message: "Must generate at least 1 question."}).max(10, {message: "Cannot generate more than 10 questions at once."}),
});

type FormData = z.infer<typeof formSchema>;

// Options for the custom select
const difficultyOptions: CustomSelectOption[] = Object.values(QuestionDifficulty).map(level => ({
    value: level,
    label: level.charAt(0).toUpperCase() + level.slice(1), // Capitalize
}));


export default function AiGeneratorPage() {
  const [generatedQuestions, setGeneratedQuestions] = useState<GenerateQuestionsOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null); // State for detailed error message
  const { toast } = useToast();
  const { userProfile, isAdmin } = useAuth(); // Get user profile for plan checks and isAdmin

  // Determine if the feature is enabled based on the user's plan
  // This part remains the same as it's about feature availability per plan.
  // const currentPlan = userProfile?.subscriptionPlanId ?? SubscriptionPlan.FREE;
  // const limits = PLAN_LIMITS[currentPlan];
  // const isAiGenerationEnabled = limits.aiQuestionGeneration;
  // For simplicity, assume AI generation is available on Pro/Enterprise if isAdmin.
  // A more granular permission check might be `userProfile?.permissions?.canGenerateAiQuestions`
  const isFeatureAllowed = isAdmin; // Simplified: only admins can access AI generator


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      difficulty: QuestionDifficulty.MEDIUM,
      numberOfQuestions: 5,
    },
  });

  const onSubmit = async (values: FormData) => {
     // Check admin rights before proceeding
     if (!isFeatureAllowed) {
        toast({
            title: "Permission Denied",
            description: "You do not have permission to use the AI Question Generator.",
            variant: "destructive",
        });
        setGenerationError("This feature is available for administrators only.");
        return;
    }

    setIsGenerating(true);
    setGeneratedQuestions(null); // Clear previous results
    setCopied(false); // Reset copied state
    setGenerationError(null); // Clear previous errors

    try {
      const result = await generateQuestions({
        topic: values.topic,
        difficulty: values.difficulty,
        numberOfQuestions: values.numberOfQuestions,
      });
      setGeneratedQuestions(result);
      toast({
        title: "Questions Generated",
        description: `Successfully generated ${result.questions.length} questions.`,
      });
    } catch (error: any) {
       const errorMessage = error instanceof Error ? error.message : String(error);
       console.error("Error generating questions:", error); // Log the full error object

       // Updated error message check based on the simplified error handling in generate-questions flow
        if (errorMessage.includes("Missing API key")) {
           setGenerationError("AI Configuration Error: Missing API Key. Please contact the administrator or check your server environment setup.");
       } else if (errorMessage.includes("Invalid API Key")) {
            setGenerationError("AI Configuration Error: Invalid API Key. Please contact the administrator or check your environment setup.");
        } else if (errorMessage.includes("AI generation failed")) { // Catch the general flow error
             setGenerationError(`Failed to generate questions. ${errorMessage}`); // Show the detailed message from the flow
        } else {
            setGenerationError(`An unexpected error occurred: ${errorMessage}`); // Fallback for other errors
        }


      toast({
        title: "Generation Failed",
        description: "Could not generate questions. Check the error message below.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedQuestions || !isFeatureAllowed) return;
    const textToCopy = JSON.stringify(generatedQuestions.questions, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      toast({ title: "Copied!", description: "Generated questions copied to clipboard." });
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({ title: "Copy Failed", description: "Could not copy questions to clipboard.", variant: "destructive"});
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Question Generator</h1>
       <Card>
        <CardHeader>
          <CardTitle>Generate Questions</CardTitle>
           {!isFeatureAllowed ? (
                <CardDescription className="text-orange-600 flex items-center gap-2">
                     <Lock className="h-4 w-4" /> This feature is available for administrators only.
                </CardDescription>
           ) : (
                <CardDescription>Use AI to create questions based on a topic and difficulty level.</CardDescription>
            )}
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
               {/* Display Generation Error */}
               {generationError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Generation Error</AlertTitle>
                    <AlertDescription>{generationError}</AlertDescription>
                  </Alert>
               )}
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Photosynthesis, World War II Causes, Basic Algebra" {...field} disabled={!isFeatureAllowed}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Difficulty</FormLabel>
                       <FormControl>
                            <CustomSelect
                                value={field.value}
                                onValueChange={field.onChange}
                                options={difficultyOptions}
                                placeholder="Select difficulty"
                                disabled={!isFeatureAllowed}
                            />
                       </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="numberOfQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Questions</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="10" {...field} disabled={!isFeatureAllowed} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button type="submit" disabled={isGenerating || !isFeatureAllowed}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                   !isFeatureAllowed ? <Lock className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : (isFeatureAllowed ? 'Generate Questions' : 'Admin Only')}
              </Button>
            </CardFooter>
          </form>
        </Form>
       </Card>

      {generatedQuestions && generatedQuestions.questions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
             <div>
               <CardTitle>Generated Questions</CardTitle>
               <CardDescription>Review the AI-generated questions below.</CardDescription>
             </div>
             <Button variant="outline" size="icon" onClick={handleCopyToClipboard} title="Copy to Clipboard" disabled={!isFeatureAllowed}>
              {copied ? <Check className="h-4 w-4 text-accent" /> : <ClipboardCopy className="h-4 w-4" />}
               <span className="sr-only">Copy to Clipboard</span>
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={JSON.stringify(generatedQuestions.questions, null, 2)}
              className="min-h-[200px] text-sm font-mono bg-muted"
              rows={generatedQuestions.questions.length * 4 + 2} // Estimate rows needed
              disabled={!isFeatureAllowed}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
