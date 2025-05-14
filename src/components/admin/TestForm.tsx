
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Test, Question, UserProfile } from '@/lib/types';
import { PLAN_LIMITS, SubscriptionPlan } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Check, Search, X, Settings, Lock, Timer, Camera, Shuffle, Calculator, MinusCircle, Undo2, Save, Clock, Code } from "lucide-react";
import { QuestionDifficulty } from '@/lib/enums';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { serverTimestamp } from 'firebase/firestore';
import { logActivity } from '@/lib/services/log.service';

// Zod schema for form validation including new fields
const formSchema = z.object({
  title: z.string().min(3, { message: "Test title must be at least 3 characters." }),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1, { message: "Duration must be at least 1 minute." }),
  status: z.enum(['Draft', 'Active', 'Archived']),
  questionIds: z.array(z.string()).min(1, { message: "Please select at least one question." }),
  showTimer: z.boolean().default(true),
  maxAttempts: z.coerce.number().int().min(1).nullable().optional().default(null),
  webcamEnabled: z.boolean().default(false),
  shuffleQuestions: z.boolean().default(false),
  lockBrowser: z.boolean().default(false),
  negativeMarking: z.boolean().default(false),
  calculatorEnabled: z.boolean().default(false),
  autoSave: z.boolean().default(true),
  allowSwitchingQuestions: z.boolean().default(true),
  gracePeriodMinutes: z.coerce.number().int().min(0).nullable().optional().default(null),
  pointsPerQuestion: z.coerce.number().min(0).optional().default(1),
  allowCodeExecution: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface TestFormProps {
  initialData?: Test; // Optional initial data for editing
}

const QuestionItemSkeleton = () => (
  <div className="flex items-center space-x-4 p-3 border-b">
     <Checkbox disabled className="opacity-50" />
     <div className="flex-grow space-y-1">
       <Skeleton className="h-4 w-3/4" />
       <Skeleton className="h-3 w-1/4" />
     </div>
     <Skeleton className="h-5 w-12 rounded-full" />
  </div>
 );

const statusOptions: CustomSelectOption[] = [
    { value: "Draft", label: "Draft" },
    { value: "Active", label: "Active" },
    { value: "Archived", label: "Archived" },
];


export default function TestForm({ initialData }: TestFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const isEditing = !!initialData;
  const [searchTerm, setSearchTerm] = useState('');

  const { data: allQuestions, isLoading: isLoadingQuestions, error: errorQuestions } = useFirestoreQuery<Question>(
    ['questions', 'allForTestForm'],
    { path: 'questions', listen: false }
  );

  const { data: userTests, isLoading: isLoadingUserTests } = useFirestoreQuery<Test>(
      ['tests', user?.uid],
      {
          path: 'tests',
          enabled: !isEditing && !!user,
          listen: false,
      }
  );

  const addMutation = useAddDocument<Test>({
    collectionPath: 'tests',
    invalidateQueries: [['tests']],
    onSuccess: async (docRef, variables) => {
      toast({ title: "Test Created", description: "New test created successfully." });
      if (user && userProfile) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Created Test',
            entityType: 'Test',
            entityId: docRef.id,
            details: { title: variables.title, status: variables.status, questionCount: variables.questionIds.length }
        });
      }
      router.push('/admin/tests');
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Could not create test.", variant: "destructive" });
    }
  });

  const updateMutation = useUpdateDocument<Test>({
    collectionPath: 'tests',
    invalidateQueries: [['tests'], ['test', initialData?.id]],
    onSuccess: async (voidResponse, variables) => {
      toast({ title: "Test Updated", description: "Test details saved successfully." });
      if (user && userProfile && initialData) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Updated Test',
            entityType: 'Test',
            entityId: initialData.id,
            details: { title: variables.data.title, status: variables.data.status, questionCount: (variables.data.questionIds as string[])?.length, changes: variables.data }
        });
      }
      router.push('/admin/tests');
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message || "Could not update test.", variant: "destructive" });
    }
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      description: initialData?.description ?? "",
      durationMinutes: initialData?.durationMinutes ?? 30,
      status: initialData?.status ?? 'Draft',
      questionIds: initialData?.questionIds ?? [],
      showTimer: initialData?.showTimer ?? true,
      maxAttempts: initialData?.maxAttempts ?? null,
      webcamEnabled: initialData?.webcamEnabled ?? false,
      shuffleQuestions: initialData?.shuffleQuestions ?? false,
      lockBrowser: initialData?.lockBrowser ?? false,
      negativeMarking: initialData?.negativeMarking ?? false,
      calculatorEnabled: initialData?.calculatorEnabled ?? false,
      autoSave: initialData?.autoSave ?? true,
      allowSwitchingQuestions: initialData?.allowSwitchingQuestions ?? true,
      gracePeriodMinutes: initialData?.gracePeriodMinutes ?? null,
      pointsPerQuestion: initialData?.pointsPerQuestion ?? 1,
      allowCodeExecution: initialData?.allowCodeExecution ?? false,
    },
  });

  const filteredQuestions = useMemo(() => {
    if (!allQuestions) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allQuestions.filter(q =>
      q.text.toLowerCase().includes(lowerSearchTerm) ||
      q.topic?.toLowerCase().includes(lowerSearchTerm) ||
      q.difficulty.toLowerCase().includes(lowerSearchTerm) ||
      q.type.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allQuestions, searchTerm]);

   const selectedQuestionIds = form.watch('questionIds', initialData?.questionIds ?? []);

  const handleQuestionSelect = useCallback((questionId: string, isSelected: boolean) => {
    const currentIds = form.getValues('questionIds') || [];
    let newIds;
    if (isSelected) {
      newIds = [...currentIds, questionId];
    } else {
      newIds = currentIds.filter(id => id !== questionId);
    }
    form.setValue('questionIds', newIds, { shouldValidate: true, shouldDirty: true });
  }, [form]);


  const onSubmit = (values: FormData) => {
    const currentPlan = userProfile?.subscriptionPlanId ?? SubscriptionPlan.FREE;
    const limits = PLAN_LIMITS[currentPlan];

    if (!isEditing && limits.maxTests !== null && (userTests?.length ?? 0) >= limits.maxTests) {
      toast({ title: "Limit Reached", description: `Your plan allows ${limits.maxTests} tests.`, variant: "destructive" });
      return;
    }
    if (limits.maxQuestionsPerTest !== null && values.questionIds.length > limits.maxQuestionsPerTest) {
      toast({ title: "Limit Reached", description: `Your plan allows ${limits.maxQuestionsPerTest} questions per test.`, variant: "destructive" });
      return;
    }

    const dataToSubmit: Partial<Test> = {
      ...values,
      maxAttempts: values.maxAttempts || null,
      gracePeriodMinutes: values.gracePeriodMinutes || null,
      creatorId: isEditing ? initialData?.creatorId : user?.uid,
      updatedAt: serverTimestamp(),
      ...( !isEditing && { createdAt: serverTimestamp() } ),
    };

    if (isEditing && initialData?.id) {
      updateMutation.mutate({ id: initialData.id, data: dataToSubmit, currentUserInfo: { userId: user!.uid, userName: userProfile?.displayName || user!.email! } });
    } else {
      addMutation.mutate(dataToSubmit as Test); // For add, logging is handled in its onSuccess
    }
  };

  const isSubmitting = addMutation.isPending || updateMutation.isPending;
  const isLoadingData = isLoadingQuestions || (!isEditing && isLoadingUserTests);

  function getDifficultyBadgeVariant(difficulty: QuestionDifficulty): "default" | "secondary" | "destructive" | "outline" {
    switch (difficulty) {
      case QuestionDifficulty.EASY: return "secondary";
      case QuestionDifficulty.MEDIUM: return "default";
      case QuestionDifficulty.HARD: return "destructive";
      default: return "outline";
    }
  }

  const SwitchField = ({ name, label, description, icon: Icon }: { name: keyof FormData, label: string, description?: string, icon?: React.ElementType }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background">
          <div className="space-y-0.5">
            <FormLabel className="text-base flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                {label}
              </FormLabel>
              {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
              <Switch
                checked={field.value as boolean}
                onCheckedChange={field.onChange}
                disabled={isSubmitting}
              />
          </FormControl>
        </FormItem>
      )}
    />
  );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Set the core details for your test.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="lg:col-span-2">
                        <FormLabel>Test Title</FormLabel>
                        <FormControl><Input placeholder="e.g., Midterm Exam, Algebra Basics" {...field} disabled={isSubmitting}/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Minutes)</FormLabel>
                        <FormControl><Input type="number" min="1" {...field} disabled={isSubmitting}/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Provide a brief overview of the test..." {...field} rows={3} disabled={isSubmitting}/></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem className="w-full md:w-1/3">
                            <FormLabel>Status</FormLabel>
                            <FormControl>
                                <CustomSelect
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={statusOptions}
                                    placeholder="Select status"
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                 <CardTitle>Questions ({selectedQuestionIds.length} selected)</CardTitle>
                 <CardDescription>Choose the questions to include. Code-related questions will only be active if "Allow Code Execution" is enabled below.</CardDescription>
                 <div className="relative pt-2">
                   <Input
                     placeholder="Search questions (text, topic, type, difficulty)..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-8"
                     disabled={isSubmitting || isLoadingData}
                   />
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    {searchTerm && (
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchTerm('')} disabled={isSubmitting}>
                            <X className="h-4 w-4"/><span className="sr-only">Clear Search</span>
                        </Button>
                    )}
                 </div>
                 <FormField
                    control={form.control}
                    name="questionIds"
                    render={({ fieldState }) => fieldState.error ? <p className="text-sm font-medium text-destructive pt-2">{fieldState.error.message}</p> : null}
                 />
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] border rounded-md">
                    <div className="p-1">
                        {isLoadingData && Array.from({length: 5}).map((_, i) => <QuestionItemSkeleton key={i}/> )}
                        {errorQuestions && <p className="p-4 text-center text-destructive">Error loading questions.</p>}
                        {!isLoadingData && filteredQuestions.length === 0 && <p className="p-4 text-center text-muted-foreground">No questions found{searchTerm ? ' matching your search' : ''}.</p>}
                        {!isLoadingData && filteredQuestions.map((question) => {
                            const isSelected = selectedQuestionIds.includes(question.id!);
                            const isCodeQuestion = question.type === 'code-snippet';
                            const allowCodeExecution = form.watch('allowCodeExecution');
                            const isIncompatible = isCodeQuestion && !allowCodeExecution;

                            return (
                                <div key={question.id} className={cn(
                                    "flex items-center space-x-3 p-3 border-b last:border-b-0 transition-colors",
                                    isIncompatible ? "opacity-50 cursor-not-allowed bg-muted/20" : "hover:bg-muted/50"
                                )}>
                                    <Checkbox
                                        id={`q-${question.id}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) => handleQuestionSelect(question.id!, !!checked)}
                                        aria-labelledby={`q-label-${question.id}`}
                                        disabled={isSubmitting || isIncompatible}
                                     />
                                    <Label htmlFor={`q-${question.id}`} id={`q-label-${question.id}`} className={cn("flex-grow", isIncompatible ? "cursor-not-allowed" : "cursor-pointer")}>
                                        <p className="font-medium leading-snug line-clamp-2">{question.text}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs capitalize">{question.type.replace('-', ' ')}</Badge>
                                            {question.topic && <p className="text-xs text-muted-foreground">Topic: {question.topic}</p>}
                                        </div>
                                        {isIncompatible && <p className="text-xs text-destructive mt-1">Enable "Allow Code Execution" in settings to use this question.</p>}
                                    </Label>
                                    <Badge variant={getDifficultyBadgeVariant(question.difficulty)} className="capitalize flex-shrink-0">{question.difficulty}</Badge>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5"/> Advanced Settings</CardTitle>
                 <CardDescription>Configure additional test behaviors and restrictions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <SwitchField name="showTimer" label="Show Timer" description="Display the countdown timer to candidates." icon={Timer} />
                        <SwitchField name="shuffleQuestions" label="Shuffle Questions" description="Randomize the order of questions for each attempt." icon={Shuffle} />
                        <SwitchField name="allowSwitchingQuestions" label="Allow Question Switching" description="Let candidates navigate freely between questions." icon={Undo2} />
                        <SwitchField name="negativeMarking" label="Negative Marking" description="Deduct points for incorrect answers (configure points later)." icon={MinusCircle} />
                         <FormField
                            control={form.control}
                            name="maxAttempts"
                             render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max Attempts</FormLabel>
                                <FormControl><Input type="number" min="1" placeholder="Unlimited" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} disabled={isSubmitting}/></FormControl>
                                <FormDescription>Leave blank or 0 for unlimited attempts.</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                    </div>
                    <div className="space-y-4">
                        <SwitchField name="webcamEnabled" label="Require Webcam" description="Mandate webcam access for proctoring." icon={Camera} />
                        <SwitchField name="lockBrowser" label="Lock Browser (Basic)" description="Attempt to prevent switching tabs (limited effectiveness)." icon={Lock} />
                        <SwitchField name="calculatorEnabled" label="Enable Calculator" description="Provide a basic in-app calculator." icon={Calculator}/>
                        <SwitchField name="autoSave" label="Auto-Save Progress" description="Automatically save answers periodically." icon={Save}/>
                         <SwitchField name="allowCodeExecution" label="Allow Code Execution" description="Enable running code snippets for specific question types." icon={Code} />
                          <FormField
                            control={form.control}
                            name="gracePeriodMinutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/>Grace Period (Minutes)</FormLabel>
                                <FormControl><Input type="number" min="0" placeholder="0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} disabled={isSubmitting}/></FormControl>
                                <FormDescription>Extra time after timer ends (0 or blank for none).</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                           <FormField
                             control={form.control}
                             name="pointsPerQuestion"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Default Points per Question</FormLabel>
                                 <FormControl><Input type="number" min="0" {...field} disabled={isSubmitting}/></FormControl>
                                  <FormDescription>Points awarded per question unless overridden.</FormDescription>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || isLoadingData}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Check className="mr-2 h-4 w-4"/> : <PlusCircle className="mr-2 h-4 w-4"/>)}
            {isEditing ? 'Save Changes' : 'Create Test'}
          </Button>
        </div>
      </form>
    </Form>
  );
}