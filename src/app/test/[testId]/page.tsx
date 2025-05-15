
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, ArrowLeft, ArrowRight, AlertTriangle, Loader2, Camera, VideoOff, Percent, Lock, Calculator as CalculatorIcon, MinusCircle, Undo2, Play, Code } from "lucide-react";
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getSubmissionById, removeUndefinedDeep } from '@/lib/utils';
import { useFirestoreDocument, useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestoreMutation';
import type { Test, Question, Submission, SubmissionAnswer, UserProfile, CodeExecutionResult, TestCase } from '@/lib/types';
import { PLAN_LIMITS, SubscriptionPlan } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Calculator from '@/components/Calculator';
import CodeEditor from '@/components/CodeEditor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
// import styles from './test.module.css'; // Ensure this file exists if uncommented or remove if not used

type Answer = string | string[] | null;
interface ExtendedAnswers { // Changed from type Answers to interface to allow index signature
  [key: string]: Answer | CodeExecutionResult[] | undefined; // Allow undefined for initial state
}


const questionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 30 : -30,
    opacity: 0,
    position: 'absolute',
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    position: 'relative',
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 30 : -30,
    opacity: 0,
    position: 'absolute',
  }),
};

function isCorrect(userAnswer: Answer, correctAnswer: Question['correctAnswer']): boolean {
  if (correctAnswer === undefined || userAnswer === null || userAnswer === undefined) return false;

  if (Array.isArray(correctAnswer)) {
    if (!Array.isArray(userAnswer)) return false;
    return userAnswer.length === correctAnswer.length && [...userAnswer].sort().every((val, index) => val === [...correctAnswer].sort()[index]);
  }
  return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
}

export default function TestPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading } = useAuth();
  const testId = params.testId as string;

  console.log(`[TestPage DEBUG] Initializing. Received testId from params: "${testId}"`);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ExtendedAnswers>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isGracePeriod, setIsGracePeriod] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Timestamp | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalPoints, setFinalPoints] = useState<{ awarded: number, max: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [blockStartReason, setBlockStartReason] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isExecutingCode, setIsExecutingCode] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, CodeExecutionResult[]>>({});
  const [hasInitiated, setHasInitiated] = useState(false);

  const isTestFetchEnabled = !!testId && !authLoading && !!user;
  console.log(`[TestPage DEBUG] isTestFetchEnabled: ${isTestFetchEnabled} (testId: ${!!testId}, !authLoading: ${!authLoading}, !!user: ${!!user})`);


  const { data: test, isLoading: isLoadingTest, error: errorTest, status: testStatus } = useFirestoreDocument<Test>(
    ['test', testId],
    {
      path: `tests/${testId}`,
      enabled: isTestFetchEnabled,
      onSuccess: (data) => {
        console.log("[TestPage] useFirestoreDocument onSuccess. Test data:", data ? JSON.stringify(data).substring(0, 200) + '...' : 'null'); // Log snippet
      },
      onError: (err) => {
        console.error("[TestPage] useFirestoreDocument onError:", err);
      }
    }
  );

  useEffect(() => {
    console.log("[TestPage] Test data status update. isLoadingTest:", isLoadingTest, "errorTest:", errorTest, "test:", test ? JSON.stringify(test).substring(0,200)+'...' : 'null', "testStatus:", testStatus);
  }, [isLoadingTest, errorTest, test, testStatus]);


  const questionIds = useMemo(() => {
    if (!test) return [];
    const ids = test.questionIds ?? [];
    if (test.shuffleQuestions) {
      return [...ids].sort(() => Math.random() - 0.5);
    }
    return ids;
  }, [test]);

  const { data: questionsData, isLoading: isLoadingQuestions, error: errorQuestions } = useFirestoreQuery<Question>(
    ['questionsForTest', testId, ...(questionIds ?? [])],
    {
      path: 'questions',
      constraints: questionIds.length > 0 && questionIds.length <= 30 ? [where('__name__', 'in', questionIds)] : [],
      enabled: !!test && questionIds.length > 0,
      onSuccess: (data) => console.log("[TestPage] Questions fetched successfully:", data?.length),
      onError: (err) => console.error("[TestPage] Error fetching questions:", err),
    }
  );

  const testQuestions = useMemo(() => {
    if (!questionsData || questionIds.length === 0) return [];
    const questionMap = new Map(questionsData.map(q => [q.id, q]));
    return questionIds.map(id => questionMap.get(id)).filter(q => q !== undefined) as Question[];
  }, [questionsData, questionIds]);

  const addSubmission = useAddDocument<Submission>({ collectionPath: 'submissions' });
  const updateSubmission = useUpdateDocument<Submission>({ collectionPath: 'submissions' });

  const currentPlan = userProfile?.subscriptionPlanId ?? SubscriptionPlan.FREE;
  const limits = PLAN_LIMITS[currentPlan];
  const canExecuteCodeOnPlan = limits.codeExecution;
  const testAllowsCodeExecution = test?.allowCodeExecution ?? false;
  const canExecuteCodeForTest = testAllowsCodeExecution && canExecuteCodeOnPlan;

  const initializeTestStateAndSubmission = useCallback(async () => {
    if (!test || testQuestions.length === 0 || submissionId !== null || isFinished || blockStartReason !== null || !user || !userProfile) {
        console.log("[TestPage] Attempted to initialize test state, but conditions not met or already initialized.", {
            test: !!test,
            testQuestionsLength: testQuestions.length,
            submissionId: submissionId,
            isFinished: isFinished,
            blockStartReason: blockStartReason,
            user: !!user,
            userProfile: !!userProfile,
        });
        return;
    }

    console.log("[TestPage] Initializing test state and creating submission.");

    const initialAnswers: ExtendedAnswers = {};
    testQuestions.forEach(q => {
      initialAnswers[q.id!] = q.type === 'code-snippet' ? (q.starterCode ?? '') : null;
    });
    setAnswers(initialAnswers);
    setExecutionResults({});

    if (test.showTimer) {
      setTimeLeft(test.durationMinutes * 60);
    } else {
      setTimeLeft(null);
    }

    const currentStartTime = Timestamp.now();
    setStartTime(currentStartTime);

    try {
      const initialSubmissionData: Omit<Submission, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        testId: testId,
        testTitle: test.title,
        userName: userProfile.displayName || user.email || 'Anonymous',
        answers: [],
        score: null,
        status: 'In Progress',
        startedAt: currentStartTime,
        submittedAt: null,
        testConfigSnapshot: { ...test }
      };
      const docRef = await addSubmission.mutateAsync(initialSubmissionData as Submission);
      setSubmissionId(docRef.id);
      console.log("[TestPage] Initial submission created with ID:", docRef.id);
    } catch (error) {
      console.error("[TestPage] Error creating initial submission:", error);
      toast({ title: "Error Starting Test", description: "Could not initialize the test. Please try again.", variant: "destructive" });
      router.push('/');
    }
  }, [test, testQuestions, submissionId, isFinished, blockStartReason, user, userProfile, testId, addSubmission, router, toast]);


  useEffect(() => {
    const isReadyToInitialize =
      !authLoading &&
      !!user &&
      !!userProfile &&
      !isLoadingTest &&
      !errorTest &&
      !!test &&
      testQuestions.length > 0 &&
      !isLoadingQuestions &&
      !isFinished &&
      submissionId === null &&
      blockStartReason === null &&
      (!test.webcamEnabled || hasCameraPermission === true);

    if (isReadyToInitialize && !hasInitiated) {
      console.log("[TestPage] Conditions met, initializing test state and creating submission via initializeTestStateAndSubmission.");
      initializeTestStateAndSubmission();
      setHasInitiated(true);
    }
  }, [authLoading, user, userProfile, isLoadingTest, errorTest, test, testQuestions.length, isLoadingQuestions, isFinished, submissionId, blockStartReason, hasCameraPermission, initializeTestStateAndSubmission, hasInitiated]);


  useEffect(() => {
    if (authLoading || !user || !userProfile) {
      console.log("[TestPage] Start check: Auth loading or no user/profile.");
      return;
    }
    if (isLoadingTest) {
      console.log("[TestPage] Start check: Test is loading.");
      return;
    }
    if (errorTest) {
      console.error("[TestPage] Start check: Error loading test, blocking start.", errorTest);
      setBlockStartReason(`Error loading test: ${errorTest.message}. Please try again or contact support.`);
      return;
    }
    if (!test) {
      console.log("[TestPage] Start check: Test data is null/undefined after loading. Cannot proceed.");
      return;
    }
    if (blockStartReason) {
      console.log("[TestPage] Start check: Already blocked with reason:", blockStartReason);
      return;
    }

    let newBlockReason: string | null = null;
    let cameraCheckUnderway = false;

    if (test.webcamEnabled) {
      if (!limits.webcamProctoring) {
        newBlockReason = "Webcam proctoring is not available on your current plan. Please upgrade to take this test.";
      } else if (hasCameraPermission === null) {
        cameraCheckUnderway = true;
        console.log("[TestPage] Requesting camera permission...");
        const getCameraPermission = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            console.log("[TestPage] Camera permission granted.");
            setHasCameraPermission(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(err => console.error("Error attempting to play video:", err));
              console.log("[TestPage] Webcam stream attached to video element.");
            }
          } catch (error) {
            console.error('[TestPage] Error accessing camera:', error);
            setHasCameraPermission(false);
            setBlockStartReason("Webcam access denied. Please enable camera permissions in your browser settings to take this test.");
            toast({
              variant: 'destructive',
              title: 'Camera Access Denied',
              description: 'Please enable camera permissions in your browser settings to take this test.',
              duration: 10000,
            });
          }
        };
        getCameraPermission();
      } else if (hasCameraPermission === false) {
        newBlockReason = "Webcam access denied. Please enable camera permissions in your browser settings to take this test.";
      }
    } else {
      if (hasCameraPermission === null) setHasCameraPermission(true);
    }

    if (cameraCheckUnderway) {
      console.log("[TestPage] Start check: Camera check is underway.");
      return;
    }

    if (newBlockReason) {
      console.log("[TestPage] Setting block reason (camera/plan):", newBlockReason);
      setBlockStartReason(newBlockReason);
      return;
    }

    if (!newBlockReason && test.allowCodeExecution && !limits.codeExecution) {
      newBlockReason = "This test includes code execution questions, which requires a Pro or Enterprise plan. Please upgrade.";
      console.log("[TestPage] Setting block reason (code execution plan):", newBlockReason);
      setBlockStartReason(newBlockReason);
    }

  }, [authLoading, user, userProfile, isLoadingTest, errorTest, test, blockStartReason, limits.webcamProctoring, limits.codeExecution, hasCameraPermission, toast, router]);


  const calculateScoreAndPoints = useCallback(() => {
    if (testQuestions.length === 0) return { percentage: 0, awarded: 0, max: 0 };
    let totalPointsAwarded = 0;
    let maxPossiblePoints = 0;
    testQuestions.forEach(q => {
      const questionPoints = q.pointsPerQuestion ?? test?.pointsPerQuestion ?? 1;
      maxPossiblePoints += questionPoints;
      const userAnswer = answers[q.id!];
      if (q.type === 'code-snippet') {
        const results = executionResults[q.id!] || [];
        const allPassed = results.length > 0 && results.every(r => r.passed);
        if (allPassed) {
          totalPointsAwarded += questionPoints;
        }
      } else if (q.type === 'multiple-choice' || q.type === 'short-answer') {
        const isAnswerCorrect = isCorrect(userAnswer as Answer, q.correctAnswer);
        if (isAnswerCorrect) {
          totalPointsAwarded += questionPoints;
        }
      }
    });
    if (maxPossiblePoints === 0) return { percentage: 0, awarded: 0, max: 0 };
    const percentage = Math.round((totalPointsAwarded / maxPossiblePoints) * 100);
    return {
      percentage: Math.max(0, Math.min(100, percentage)),
      awarded: totalPointsAwarded,
      max: maxPossiblePoints
    };
  }, [testQuestions, answers, test?.pointsPerQuestion, executionResults]);


  const saveProgress = useCallback(async (isFinalSave = false) => {
    if (!submissionId || isFinished || (isSubmitting && !isFinalSave) || !(test?.autoSave ?? true)) return;
    const currentAnswersToSave = Object.entries(answers)
      .map(([questionId, answer]) => {
        const question = testQuestions.find(q => q.id === questionId);
        return {
          questionId,
          answer: answer as Answer,
          codeExecutionResults: question?.type === 'code-snippet' ? (executionResults[questionId] || []) : undefined,
        };
      })
      .filter(a => a.answer !== null && a.answer !== '');
    try {
      await updateSubmission.mutateAsync({
        id: submissionId,
        data: {
          answers: currentAnswersToSave,
          updatedAt: serverTimestamp(),
        }
      }, {
        onSuccess: () => { if (!isFinalSave) console.log("[TestPage] Progress auto-saved") },
        onError: (error) => { console.warn("[TestPage] Auto-save failed:", error.message); }
      });
    } catch (error) {
      console.warn("[TestPage] Error during auto-save:", error);
    }
  }, [submissionId, answers, isFinished, isSubmitting, test?.autoSave, updateSubmission, testQuestions, executionResults]);

  const handleFinishTest = useCallback(async (autoSubmit = false) => {
    if (!submissionId || isFinished || isSubmitting) return;
    setIsSubmitting(true);
    await saveProgress(true);
    const { percentage, awarded, max } = calculateScoreAndPoints();
    setFinalScore(percentage);
    setFinalPoints({ awarded, max });
    const finalAnswers = Object.entries(answers)
      .map(([questionId, answer]) => {
        const question = testQuestions.find(q => q.id === questionId);
        const questionPoints = question?.pointsPerQuestion ?? test?.pointsPerQuestion ?? 1;
        let isAnswerCorrect: boolean | null = null;
        let pointsAwarded: number | null = null;
        let results: CodeExecutionResult[] | undefined = undefined;
        if (question?.type === 'code-snippet') {
          results = executionResults[questionId] || [];
          const allPassed = results.length > 0 && results.every(r => r.passed);
          isAnswerCorrect = allPassed;
          pointsAwarded = allPassed ? questionPoints : 0;
        } else if (question?.type === 'multiple-choice' || question?.type === 'short-answer') {
          isAnswerCorrect = isCorrect(answer as Answer, question?.correctAnswer);
          pointsAwarded = isAnswerCorrect ? questionPoints : 0;
        }
        return {
          questionId,
          answer: answer as Answer,
          isCorrect: isAnswerCorrect,
          score: pointsAwarded,
          ...(question?.type === 'code-snippet' && results !== undefined
            ? { codeExecutionResults: results }
            : {}),          
        };
      })
      .filter(a => a.answer !== null && (typeof a.answer === 'string' ? a.answer.trim() !== '' : Array.isArray(a.answer) ? a.answer.length > 0 : true));

    let timeTakenSeconds: number | undefined = undefined;
    if (startTime) {
      const now = Timestamp.now();
      timeTakenSeconds = now.seconds - startTime.seconds;
    }
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        console.log("[TestPage] Webcam stream stopped.");
      }
      console.log("Server timestamp token:", serverTimestamp());
      const payload = {
        status: 'Submitted',
        submittedAt: serverTimestamp(),
        score: percentage,
        totalPointsAwarded: awarded,
        maxPossiblePoints: max,
        timeTakenSeconds: timeTakenSeconds,
        updatedAt: serverTimestamp(),
        answers: finalAnswers,
      };
      
      await updateSubmission.mutateAsync({
        id: submissionId,
        data: removeUndefinedDeep(payload)
      });
      setIsFinished(true);
      setTimeLeft(0);
      toast({
        title: "Test Submitted",
        description: autoSubmit ? "Time ran out. Your test was automatically submitted." : "Your answers have been submitted successfully.",
        variant: autoSubmit ? "destructive" : "default",
        duration: 5000,
      });
    } catch (error) {
      console.error("[TestPage] Error submitting test:", error);
      toast({ title: "Submission Failed", description: "Could not submit your answers. Please check your connection and try again.", variant: "destructive" });
      setIsSubmitting(false);
    }
  }, [submissionId, isFinished, isSubmitting, calculateScoreAndPoints, answers, startTime, updateSubmission, toast, testQuestions, test?.pointsPerQuestion, executionResults, saveProgress]);


  useEffect(() => {
    if (timeLeft === null || isFinished || !submissionId || !(test?.showTimer ?? true)) {
      return;
    }
    if (timeLeft <= 0 && !isGracePeriod) {
      const graceMinutes = test?.gracePeriodMinutes ?? 0;
      if (graceMinutes > 0) {
        setIsGracePeriod(true);
        setTimeLeft(graceMinutes * 60);
        toast({ title: "Time's Up!", description: `Grace period of ${graceMinutes} minute(s) started. Submit your answers now.`, variant: "destructive", duration: 7000 });
      } else {
        handleFinishTest(true);
      }
      return;
    }
    if (timeLeft <= 0 && isGracePeriod) {
      handleFinishTest(true);
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => (prevTime !== null ? Math.max(0, prevTime - 1) : null));
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isFinished, submissionId, isGracePeriod, test?.gracePeriodMinutes, test?.showTimer, handleFinishTest, toast]);


  useEffect(() => {
    if (!(test?.autoSave ?? true) || isFinished || !submissionId) return;
    const intervalId = setInterval(() => saveProgress(false), 30000);
    return () => clearInterval(intervalId);
  }, [test?.autoSave, isFinished, submissionId, saveProgress]);


  const handleAnswerChange = (questionId: string, value: Answer | CodeExecutionResult[] | undefined) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (!(test?.autoSave ?? true) && (test?.autoSave === false)) {
      saveProgress(false);
    }
  };


  const paginate = (newDirection: number) => {
    if (!(test?.autoSave ?? true)) {
      saveProgress(false);
    }
    const newIndex = currentQuestionIndex + newDirection;
    if (newIndex >= 0 && newIndex < testQuestions.length) {
      setDirection(newDirection);
      setCurrentQuestionIndex(newIndex);
    }
  };

  const handleExecuteCode = async (questionId: string) => {
    if (!canExecuteCodeForTest || isExecutingCode) return;

    const question = testQuestions.find(q => q.id === questionId);
    const userCode = answers[questionId] as string;

    if (!question || question.type !== 'code-snippet' || !userCode || !question.testCases) {
      toast({ title: "Cannot Execute", description: "Missing code, language, or test cases.", variant: "destructive" });
      return;
    }

    setIsExecutingCode(true);
    setExecutionResults(prev => ({ ...prev, [questionId]: [] }));

    console.log("[TestPage] Executing code for Q:", questionId);
    console.log("Language:", question.language);
    console.log("Code:", userCode);
    console.log("Test Cases:", question.testCases);

    // Simulate API call or actual execution environment
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const mockResults: CodeExecutionResult[] = question.testCases.map(tc => {
      let output = `Simulated output for input: ${tc.input}`;
      let passed = false;
      let error = null;

      try {
        if (tc.expectedOutput && userCode.includes(tc.expectedOutput)) {
          passed = true;
          output = tc.expectedOutput;
        } else if (userCode.includes("error")) {
          throw new Error("Simulated runtime error");
        }
      } catch (e: any) {
        error = e.message;
        output = `Error: ${e.message}`;
        passed = false;
      }

      return {
        input: tc.input,
        output: output,
        expectedOutput: tc.expectedOutput,
        passed: passed,
        error: error,
        executionTime: Math.random() * 100 + 50
      };
    });

    setExecutionResults(prev => ({ ...prev, [questionId]: mockResults }));
    setIsExecutingCode(false);
    toast({ title: "Execution Complete", description: `Finished running code against ${question.testCases.length} test cases.` });
  };


  const currentQuestion = testQuestions[currentQuestionIndex];
  const progress = (isLoadingTest || isLoadingQuestions || testQuestions.length === 0) ? 0 : ((currentQuestionIndex + 1) / testQuestions.length) * 100;

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--';
    if (seconds <= 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isLoadingOverall = authLoading || isLoadingTest || (!!test && questionIds.length > 0 && isLoadingQuestions && testQuestions.length === 0);
  const combinedError = errorTest || errorQuestions;

  if (isLoadingOverall) {
    console.log("[TestPage] Rendering LoadingSkeleton. authLoading:", authLoading, "isLoadingTest:", isLoadingTest, "isLoadingQuestions:", isLoadingQuestions);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
        <Card className="w-full max-w-3xl shadow-lg">
          <CardHeader className="border-b p-4"><Skeleton className="h-6 w-3/5" /><Skeleton className="h-4 w-2/5 mt-1" /></CardHeader>
          <CardContent className="py-8 px-6 space-y-6 min-h-[350px]">
            <Skeleton className="h-6 w-4/5 mb-4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter className="flex justify-between border-t p-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (combinedError) {
    console.error("[TestPage] Rendering Error Alert. errorTest:", errorTest, "errorQuestions:", errorQuestions);
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Test Data</AlertTitle>
          <AlertDescription>
            Could not load test details or questions. Please try again later. <br />
            <code className="text-xs">{combinedError.message}</code>
          </AlertDescription>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/')}>Back to Home</Button>
        </Alert>
      </div>
    );
  }

  if (blockStartReason) {
    console.log("[TestPage] Rendering BlockStartReason Alert:", blockStartReason);
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-lg">
          {blockStartReason.includes("Webcam access denied") ? <VideoOff className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          <AlertTitle>Cannot Start Test</AlertTitle>
          <AlertDescription>
            {blockStartReason}
          </AlertDescription>
          {blockStartReason.includes("Webcam access denied") && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => window.location.reload()}>Refresh Page To Grant Permission</Button>
          )}
          <Button variant="link" size="sm" className="mt-4 ml-2" onClick={() => router.push('/')}>Back to Home</Button>
        </Alert>
      </div>
    );
  }

  if (!isLoadingOverall && !combinedError && (!test || (test && test.questionIds.length > 0 && testQuestions.length === 0 && !isLoadingQuestions))) {
    let description = "The test details or questions are not available. It might be in draft status or misconfigured.";
    console.warn(`[TestPage DEBUG] Rendering 'Test Not Ready' Alert. Test data: ${test ? JSON.stringify(test).substring(0,200)+'...' : 'null'}, testQuestions length: ${testQuestions.length}, isLoadingQuestions: ${isLoadingQuestions}, isLoadingTest: ${isLoadingTest}, errorTest: ${errorTest}, testId: "${testId}"`);

    if (!test && !isLoadingTest && !errorTest) {
      description = `The test could not be found. It may have been deleted, the ID is incorrect ("${testId}"), or you may not have permission to access it. Path: "tests/${testId}"`;
    } else if (test && test.status !== 'Active') {
      description = `This test ("${test.title}") is not active (current status: ${test.status}). It cannot be taken at the moment.`;
    } else if (test && test.questionIds.length > 0 && testQuestions.length === 0 && !isLoadingQuestions) {
      description = `This active test ("${test.title}") has question IDs linked, but these questions could not be loaded. Please check if the questions exist or contact an administrator. (Question IDs: ${test.questionIds.join(', ')})`;
    } else if (test && test.questionIds.length === 0) {
      description = `This active test ("${test.title}") has no questions linked to it. Please add questions to this test or contact an administrator.`;
    }

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Test Not Ready</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/')}>Back to Home</Button>
        </Alert>
      </div>
    );
  }

  if (!isLoadingOverall && !combinedError && !isFinished && !submissionId && !blockStartReason && test && testQuestions.length > 0) {
    console.log("[TestPage] Waiting for submissionId to be set before rendering main test UI...");
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Preparing your test...</p>
      </div>
    );
  }


  if (isFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4"
      >
        <Card className="w-full max-w-lg text-center p-10 shadow-xl border border-green-200">
          <CardHeader>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 150 }}>
              <CheckCircle className="mx-auto h-16 w-16 text-accent mb-4" />
            </motion.div>
            <CardTitle className="text-2xl lg:text-3xl font-semibold">Test Submitted!</CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2">Your answers have been successfully recorded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {finalScore !== null && finalPoints !== null && (
              <div className="mt-4 border-t pt-4">
                <p className="text-muted-foreground text-sm mb-1">Your Score:</p>
                <p className="text-4xl font-bold text-primary flex items-center justify-center gap-2">
                  {finalScore}%
                  <span className="text-xl font-medium text-muted-foreground">
                    ({finalPoints.awarded} / {finalPoints.max} pts)
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">(Score may change after manual review for essay/code questions)</p>
              </div>
            )}
            <p className="mt-4">Thank you for completing the <span className="font-medium">{test?.title}</span>.</p>
          </CardContent>
          <CardFooter className="justify-center mt-6">
            <Button onClick={() => router.push('/')} size="lg" className="shadow-md">
              Back to Home <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 md:p-8 bg-gradient-to-b from-primary/5 to-background">
      <Card className="w-full max-w-3xl shadow-lg overflow-hidden border">
        <CardHeader className="border-b bg-card sticky top-0 z-10 p-4">
          <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 mb-2">
            <div className="flex-grow min-w-0">
              <CardTitle className="text-xl md:text-2xl font-semibold truncate" title={test?.title}>{test?.title}</CardTitle>
              <CardDescription>Question {currentQuestionIndex + 1} of {testQuestions.length}</CardDescription>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {test?.showTimer && (
                <motion.div
                  key={timeLeft}
                  initial={{ scale: 1 }}
                  animate={timeLeft !== null && timeLeft <= 60 && !isGracePeriod ? { scale: [1, 1.05, 1], color: ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--primary))"] } : {}}
                  transition={timeLeft !== null && timeLeft <= 60 && !isGracePeriod ? { duration: 1, repeat: Infinity } : {}}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    isGracePeriod ? "text-destructive font-bold animate-pulse" : (timeLeft !== null && timeLeft <= 60 ? 'text-destructive' : 'text-primary')
                  )}
                  title="Time Remaining"
                >
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(timeLeft)} {isGracePeriod ? '(Grace)' : ''}</span>
                </motion.div>
              )}
              {test?.calculatorEnabled && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" title="Calculator">
                      <CalculatorIcon className="h-4 w-4" />
                      <span className="sr-only">Calculator</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Calculator />
                  </PopoverContent>
                </Popover>
              )}
               {test?.webcamEnabled && hasCameraPermission === true && (
                <div className="w-20 h-16 rounded-md overflow-hidden border bg-muted relative" title="Webcam Feed">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                </div>
              )}
              {test?.webcamEnabled && hasCameraPermission === false && ( // Show placeholder if permission denied
                <div className="w-20 h-16 rounded-md overflow-hidden border bg-muted relative flex items-center justify-center" title="Webcam Disabled">
                  <VideoOff className="w-6 h-6 text-destructive" />
                </div>
              )}
            </div>
          </div>
          <Progress value={progress} className="w-full h-2 rounded-full" aria-label={`Test progress: ${Math.round(progress)}%`} />
          {(test?.lockBrowser || test?.negativeMarking) && (
            <div className="mt-2 space-y-1">
              {test?.lockBrowser && (
                <Alert variant="default" className="text-xs p-1.5 flex items-center gap-1">
                  <Lock className="h-3 w-3 flex-shrink-0" />
                  <AlertDescription>Browser activity may be monitored. Avoid switching tabs.</AlertDescription>
                </Alert>
              )}
              {test?.negativeMarking && (
                <Alert variant="default" className="text-xs p-1.5 flex items-center gap-1">
                  <MinusCircle className="h-3 w-3 flex-shrink-0" />
                  <AlertDescription>Incorrect answers may result in negative marking.</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="py-8 px-6 min-h-[350px] relative overflow-x-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            {currentQuestion ? (
              <motion.div
                key={currentQuestionIndex}
                custom={direction}
                variants={questionVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="w-full"
              >
                <div className="space-y-6">
                  {currentQuestion.imageUrl && (
                    <div className="relative w-full max-w-md mx-auto aspect-video mb-4 rounded-md overflow-hidden border">
                      <Image src={currentQuestion.imageUrl} alt={`Question ${currentQuestionIndex + 1} image`} layout="fill" objectFit="contain" data-ai-hint="question illustration diagram" />
                    </div>
                  )}
                  <p className={cn("font-semibold text-lg md:text-xl leading-relaxed whitespace-pre-wrap")}>
                    {currentQuestion.text}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {currentQuestion.pointsPerQuestion ?? test?.pointsPerQuestion ?? 1} point(s)
                  </Badge>

                  {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                    <RadioGroup
                      value={typeof answers[currentQuestion.id!] === 'string' ? answers[currentQuestion.id!] as string : ''}
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id!, value)}
                      className="space-y-3"
                      disabled={isSubmitting || isFinished}
                    >
                      {currentQuestion.options.map((option, index) => (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex items-center space-x-3 p-3 border rounded-md transition-colors",
                            (isSubmitting || isFinished)
                              ? "cursor-not-allowed opacity-70 bg-muted/50"
                              : "cursor-pointer hover:bg-secondary/50 has-[:checked]:bg-primary/10 has-[:checked]:border-primary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                          )}
                        >
                          <RadioGroupItem
                            value={option.id}
                            id={`${currentQuestion.id}-option-${index}`}
                            disabled={isSubmitting || isFinished}
                          />
                          <Label
                            htmlFor={`${currentQuestion.id}-option-${index}`}
                            className={cn("flex-1", (isSubmitting || isFinished) ? "cursor-not-allowed" : "cursor-pointer")}
                          >
                            {option.text}
                          </Label>
                        </motion.div>
                      ))}
                    </RadioGroup>
                  )}
                  {currentQuestion.type === 'short-answer' && (
                    <Textarea
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id!] as string ?? ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
                      className="min-h-[80px] text-base"
                      rows={3}
                      aria-label={`Answer for question`}
                      disabled={isSubmitting || isFinished}
                    />
                  )}
                  {currentQuestion.type === 'essay' && (
                    <Textarea
                      placeholder="Type your essay response here..."
                      value={answers[currentQuestion.id!] as string ?? ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
                      className="min-h-[200px] text-base leading-relaxed"
                      rows={8}
                      aria-label={`Essay answer for question`}
                      disabled={isSubmitting || isFinished}
                    />
                  )}
                  {currentQuestion.type === 'code-snippet' && (
                    <div className="space-y-4">
                      <CodeEditor
                        mode={currentQuestion.language || 'javascript'}
                        value={answers[currentQuestion.id!] as string ?? ''}
                        onChange={(value) => handleAnswerChange(currentQuestion.id!, value)}
                        placeholder="Write your code here..."
                        height="300px"
                        readOnly={isSubmitting || isFinished || isExecutingCode}
                      />
                      <div className="flex items-center justify-end gap-2">
                        {testAllowsCodeExecution && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleExecuteCode(currentQuestion.id!)}
                            disabled={isExecutingCode || isSubmitting || isFinished || !answers[currentQuestion.id!] || !canExecuteCodeForTest}
                            title={!canExecuteCodeForTest ? "Code execution is not available on your current plan." : ""}
                          >
                            {isExecutingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            {isExecutingCode ? 'Running...' : 'Run Code'}
                            {!canExecuteCodeForTest && <Lock className="ml-2 h-3 w-3 text-muted-foreground" />}
                          </Button>
                        )}
                      </div>
                      {executionResults[currentQuestion.id!] && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-semibold">Execution Results:</h4>
                          {executionResults[currentQuestion.id!].map((result, idx) => (
                            <div key={idx} className={cn("text-xs p-3 rounded-md border", result.passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
                              <p className="flex justify-between items-center font-medium mb-1">
                                <span>Test Case {idx + 1}</span>
                                <Badge variant={result.passed ? "secondary" : "destructive"}>{result.passed ? "Passed" : "Failed"}</Badge>
                              </p>
                              <p><strong>Input:</strong> <pre className="inline whitespace-pre-wrap">{result.input || '<none>'}</pre></p>
                              <p><strong>Output:</strong> <pre className="inline whitespace-pre-wrap">{result.output || '<none>'}</pre></p>
                              {!result.passed && result.expectedOutput && <p><strong>Expected:</strong> <pre className="inline whitespace-pre-wrap">{result.expectedOutput}</pre></p>}
                              {result.error && <p className="text-destructive mt-1"><strong>Error:</strong> {result.error}</p>}
                              {result.executionTime !== null && result.executionTime !== undefined && <p className="text-muted-foreground text-xs mt-1">Time: {result.executionTime?.toFixed(0)}ms</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-4 bg-secondary/50 sticky bottom-0 z-10">
          <Button
            variant="outline"
            onClick={() => paginate(-1)}
            disabled={currentQuestionIndex === 0 || isSubmitting || !(test?.allowSwitchingQuestions ?? true) || isFinished || isExecutingCode}
            aria-label="Previous Question"
            className="shadow-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          {currentQuestionIndex < testQuestions.length - 1 ? (
            <Button onClick={() => paginate(1)} aria-label="Next Question" className="shadow-sm" disabled={isSubmitting || isFinished || isExecutingCode}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md" disabled={isSubmitting || isFinished || isExecutingCode}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  {isSubmitting ? 'Submitting...' : 'Finish Test'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finish Test?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit your answers? You cannot make changes after submitting.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleFinishTest(false)} disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Submit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

