'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestoreDocument, useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useUpdateDocument } from '@/hooks/useFirestoreMutation';
import type { Submission, Test, Question, SubmissionAnswer } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, User, Clock, Calendar, Check, X, HelpCircle, Save, Percent as PercentIcon, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, formatDistanceStrict } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';

const LoadingSkeleton = () => (
   <div className="space-y-6">
     <div className="flex items-center gap-4">
       <Skeleton className="h-10 w-10 rounded-md" />
       <Skeleton className="h-8 w-1/2" />
     </div>
     <Card>
       <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-1" />
          <Skeleton className="h-4 w-1/2" />
       </CardHeader>
        <CardContent className="space-y-8">
           <div className="space-y-4 p-4 border rounded-md">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-1/4" />
           </div>
           <div className="space-y-4 p-4 border rounded-md">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-1/4" />
           </div>
           <div className="space-y-4 p-4 border rounded-md">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-1/4" />
            </div>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Skeleton className="h-10 w-24" />
        </CardFooter>
     </Card>
   </div>
 );

 function isCorrect(userAnswer: SubmissionAnswer['answer'], correctAnswer: Question['correctAnswer']): boolean {
     if (correctAnswer === undefined || userAnswer === null || userAnswer === undefined) return false;
     if (Array.isArray(correctAnswer)) {
         if (!Array.isArray(userAnswer)) return false;
         return userAnswer.length === correctAnswer.length && [...userAnswer].sort().every((val, index) => val === [...correctAnswer].sort()[index]);
     }
     return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
 }

 function formatAnswer(answer: SubmissionAnswer['answer']): string {
      if (answer === null || answer === undefined) return 'No Answer Provided';
      if (Array.isArray(answer)) return answer.join(', ');
      return String(answer);
  }


export default function GradeSubmissionPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const router = useRouter();
  const { toast } = useToast();

  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});

  const { data: submission, isLoading: isLoadingSubmission, error: errorSubmission } = useFirestoreDocument<Submission>(
    ['submission', submissionId],
    { path: `submissions/${submissionId}`, enabled: !!submissionId, listen: false }
  );

   // Fetch Test data only if needed (e.g., for original pointsPerQuestion if not in snapshot)
   const { data: test, isLoading: isLoadingTest, error: errorTest } = useFirestoreDocument<Test>(
     ['test', submission?.testId],
     { path: `tests/${submission?.testId}`, enabled: !!submission?.testId && !submission?.testConfigSnapshot?.pointsPerQuestion }
   );

   // Extract question IDs from submission answers if available, fallback to test data
    const questionIds = useMemo(() => {
        return submission?.answers?.map(a => a.questionId) ?? test?.questionIds ?? [];
    }, [submission?.answers, test?.questionIds]);

   const { data: questions, isLoading: isLoadingQuestions, error: errorQuestions } = useFirestoreQuery<Question>(
     ['questions', submission?.testId],
     {
       path: 'questions',
       enabled: questionIds.length > 0,
     }
   );

    const testQuestions = useMemo(() => {
      if (!questions || questionIds.length === 0) return [];
      const questionMap = new Map(questions.map(q => [q.id, q]));
      return questionIds.map(id => questionMap.get(id)).filter(q => q !== undefined) as Question[];
    }, [questions, questionIds]);

   const answersMap = useMemo(() => {
     const map = new Map<string, SubmissionAnswer['answer']>();
     submission?.answers?.forEach(ans => map.set(ans.questionId, ans.answer));
     return map;
   }, [submission?.answers]);

    const updateSubmissionMutation = useUpdateDocument<Submission>({
      collectionPath: 'submissions',
      invalidateQueries: [['submissions'], ['submission', submissionId]],
      onSuccess: () => {
        toast({ title: "Grading Saved", description: "Submission score and feedback updated." });
        router.push(`/admin/submissions/${submissionId}`);
      },
      onError: (error) => {
        toast({ title: "Saving Failed", description: error.message || "Could not save grading.", variant: "destructive" });
      }
    });

    // Helper to get points for a question, prioritizing question-specific, then test snapshot, then test default
    const getPointsForQuestion = useCallback((questionId: string): number => {
        const question = testQuestions.find(q => q.id === questionId);
        return question?.pointsPerQuestion ?? submission?.testConfigSnapshot?.pointsPerQuestion ?? test?.pointsPerQuestion ?? 1;
    }, [testQuestions, submission?.testConfigSnapshot, test?.pointsPerQuestion]);


    useEffect(() => {
        // Pre-fill only if manualScores is empty and data is loaded
        if (testQuestions.length > 0 && submission && Object.keys(manualScores).length === 0) {
            const initialScores: Record<string, number> = {};
            const initialFeedback: Record<string, string> = {};

            submission.answers.forEach(ans => {
                 const question = testQuestions.find(q => q.id === ans.questionId);
                 if (question) {
                    // Use existing score if available from previous grading, otherwise auto-grade or default to 0
                    initialScores[ans.questionId] = ans.score ?? (
                        (question.type === 'multiple-choice' || question.type === 'short-answer') && isCorrect(ans.answer, question.correctAnswer)
                        ? getPointsForQuestion(ans.questionId) // Award full points if correct
                        : 0 // Default to 0 for incorrect/manual grade needed
                     );
                 }
                 if (ans.feedback) {
                     initialFeedback[ans.questionId] = ans.feedback;
                 }
            });

            setManualScores(initialScores);
            setFeedbackNotes(initialFeedback);
        }
    // Depend on getPointsForQuestion and other relevant data
    }, [testQuestions, submission, manualScores, getPointsForQuestion]);


    const handleScoreChange = (questionId: string, score: string) => {
        const numericScore = parseFloat(score);
        const maxPoints = getPointsForQuestion(questionId);

        if (!isNaN(numericScore) && numericScore >= 0 && numericScore <= maxPoints) {
            setManualScores(prev => ({ ...prev, [questionId]: numericScore }));
        } else if (score === '') {
             setManualScores(prev => ({ ...prev, [questionId]: 0 }));
        } else if (!isNaN(numericScore) && numericScore > maxPoints) {
             setManualScores(prev => ({ ...prev, [questionId]: maxPoints }));
        }
    };

    const handleFeedbackChange = (questionId: string, feedback: string) => {
         setFeedbackNotes(prev => ({ ...prev, [questionId]: feedback }));
    };

    // --- Calculate Total Score & Points ---
    const calculateTotalScoreAndPoints = () => {
       if (testQuestions.length === 0) return { percentage: 0, awarded: 0, max: 0 };

       let totalPointsAwarded = 0;
       let maxPossiblePoints = 0;

       testQuestions.forEach(q => {
           const maxPoints = getPointsForQuestion(q.id!);
           maxPossiblePoints += maxPoints;
           totalPointsAwarded += manualScores[q.id!] ?? 0; // Sum up manually assigned scores
       });

       if (maxPossiblePoints === 0) return { percentage: 0, awarded: 0, max: 0 };

       const percentage = Math.round((totalPointsAwarded / maxPossiblePoints) * 100);
       return {
           percentage: Math.max(0, Math.min(100, percentage)),
           awarded: totalPointsAwarded,
           max: maxPossiblePoints
       };
    };

    const { percentage: calculatedPercentage, awarded: totalAwarded, max: totalMax } = calculateTotalScoreAndPoints();


    const handleSaveGrading = () => {
       if (!submission?.id) return;
       const { percentage, awarded, max } = calculateTotalScoreAndPoints();

       const updatedAnswers = submission.answers.map(ans => {
            const question = testQuestions.find(q => q.id === ans.questionId);
            const pointsAwarded = manualScores[ans.questionId] ?? 0;
             // Re-check correctness based on points only if auto-gradable type
            const isAnswerCorrect = (question?.type === 'multiple-choice' || question?.type === 'short-answer') && question.correctAnswer !== undefined
                ? isCorrect(ans.answer, question.correctAnswer)
                : null; // Keep null for essays/manual grading

            return {
                ...ans,
                score: pointsAwarded, // Save the manually entered score (points)
                feedback: feedbackNotes[ans.questionId] || null, // Ensure null if empty
                isCorrect: isAnswerCorrect,
           }
       });

       updateSubmissionMutation.mutate({
         id: submission.id,
         data: {
           score: percentage, // Overall percentage
           totalPointsAwarded: awarded, // Total points awarded
           maxPossiblePoints: max, // Max possible points for the test
           status: 'Graded',
           gradedAt: serverTimestamp(),
           answers: updatedAnswers,
           // graderId: user?.uid, // TODO: Get current admin user ID
         }
       });
     };

  const isLoading = isLoadingSubmission || isLoadingTest || isLoadingQuestions;
  const error = errorSubmission || errorTest || errorQuestions;

   if (isLoading) return <LoadingSkeleton />;
   if (error) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
   if (!submission) return <Alert><AlertTriangle className="h-4 w-4" /><AlertTitle>Not Found</AlertTitle><AlertDescription>Submission not found.</AlertDescription></Alert>;


  return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.5 }}
       className="space-y-6"
     >
       <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/admin/submissions/${submissionId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Submission Details</span>
            </Link>
          </Button>
         <h1 className="text-3xl font-bold">Grade Submission</h1>
       </div>

       <Card>
           <CardHeader>
               <CardTitle className="text-lg">{submission.testTitle}</CardTitle>
               <CardDescription>Grading for {submission.userName || submission.userId}</CardDescription>
           </CardHeader>
            <CardContent className="text-sm flex flex-wrap justify-between items-center gap-4">
               <div>Score: <span className="font-bold">{calculatedPercentage}%</span> ({totalAwarded} / {totalMax} pts)</div>
               <div className="flex items-center gap-1">Status: <Badge variant={submission.status === 'Graded' ? 'default' : 'secondary'} className="capitalize">{submission.status}</Badge></div>
               {submission.submittedAt && <div>Submitted: {format(submission.submittedAt.toDate(), 'PPp')}</div>}
           </CardContent>
       </Card>

       <Card>
         <CardHeader>
           <CardTitle>Review Answers</CardTitle>
            <CardDescription>Assign points and provide feedback for each question.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-8">
           {testQuestions.map((question, index) => {
             const userAnswer = answersMap.get(question.id!);
             const isMC = question.type === 'multiple-choice';
             const correctAnswer = question.correctAnswer;
             const autoCorrect = isCorrect(userAnswer, correctAnswer);
             const currentScore = manualScores[question.id!] ?? ''; // Keep empty for placeholder
             const currentFeedback = feedbackNotes[question.id!] ?? '';
             const maxPoints = getPointsForQuestion(question.id!);

             return (
               <div key={question.id} className="pb-6 border-b last:border-b-0">
                 <div className="flex justify-between items-start mb-3">
                    <p className="font-semibold flex-grow pr-4">Q{index + 1} ({maxPoints} {maxPoints === 1 ? 'point' : 'points'}): {question.text}</p>
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{question.difficulty}</Badge>
                 </div>

                 <div className="mb-4 p-3 bg-muted/50 rounded-md">
                    <Label className="text-xs text-muted-foreground block mb-1">Candidate's Answer</Label>
                    <p className={cn(
                        "text-sm whitespace-pre-wrap",
                        autoCorrect && (isMC || question.type === 'short-answer') ? "text-green-700" : "",
                        !autoCorrect && userAnswer !== null && (isMC || question.type === 'short-answer') ? "text-red-700" : ""
                    )}>
                        {formatAnswer(userAnswer)}
                         {autoCorrect && (isMC || question.type === 'short-answer') && <Check className="h-4 w-4 inline-block ml-1" />}
                         {!autoCorrect && userAnswer !== null && (isMC || question.type === 'short-answer') && <X className="h-4 w-4 inline-block ml-1" />}
                         {userAnswer === null && <HelpCircle className="h-4 w-4 inline-block ml-1 text-muted-foreground" />}
                    </p>
                 </div>

                  {correctAnswer !== undefined && question.type !== 'essay' && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                       <Label className="text-xs text-green-800 block mb-1">Correct Answer / Reference</Label>
                       <p className="text-sm text-green-800">{formatAnswer(correctAnswer)}</p>
                    </div>
                   )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                     <div className="md:col-span-1">
                        <Label htmlFor={`score-${question.id}`}>Points Awarded</Label>
                         <Input
                           id={`score-${question.id}`}
                           type="number"
                           min="0"
                           max={maxPoints}
                           step="0.5"
                           placeholder={`0 - ${maxPoints}`}
                           value={currentScore}
                           onChange={(e) => handleScoreChange(question.id!, e.target.value)}
                           className="mt-1"
                           disabled={updateSubmissionMutation.isPending}
                         />
                     </div>
                      <div className="md:col-span-2">
                        <Label htmlFor={`feedback-${question.id}`}>Feedback (Optional)</Label>
                         <Textarea
                           id={`feedback-${question.id}`}
                           placeholder="Provide specific feedback..."
                           value={currentFeedback}
                           onChange={(e) => handleFeedbackChange(question.id!, e.target.value)}
                           className="mt-1"
                           rows={2}
                            disabled={updateSubmissionMutation.isPending}
                         />
                      </div>
                  </div>

               </div>
             );
           })}
         </CardContent>
          <CardFooter className="flex flex-col items-end gap-4 pt-6 border-t">
            <div className="text-right">
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold">{calculatedPercentage}%</p>
                 <p className="text-sm text-muted-foreground">({totalAwarded} / {totalMax} Points)</p>
            </div>
            <Button
                onClick={handleSaveGrading}
                disabled={updateSubmissionMutation.isPending}
            >
                {updateSubmissionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                {submission.status === 'Graded' ? 'Update Grading' : 'Save Grading'}
            </Button>
          </CardFooter>
       </Card>
    </motion.div>
  );
}