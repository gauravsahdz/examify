'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestoreDocument, useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import type { Submission, Test, Question, SubmissionAnswer } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, User, Clock, Calendar, Check, X, HelpCircle, Pencil, TrendingUp, Target } from 'lucide-react'; // Added icons
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { format, formatDistanceStrict } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Image from 'next/image'; // Import Next Image


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
       <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
       </CardContent>
     </Card>
     <Card>
       <CardHeader>
          <Skeleton className="h-6 w-1/4" />
       </CardHeader>
        <CardContent className="space-y-6">
           <Skeleton className="h-24 w-full" />
           <Skeleton className="h-24 w-full" />
           <Skeleton className="h-24 w-full" />
        </CardContent>
     </Card>
   </div>
 );

 function getScoreBadgeVariant(score: number | null): VariantProps<typeof badgeVariants>["variant"] {
    if (score === null) return "outline";
    if (score >= 90) return "default";
    if (score >= 70) return "secondary";
    return "destructive";
 }

 function getStatusBadgeVariant(status: Submission['status']): VariantProps<typeof badgeVariants>["variant"] {
     switch (status) {
         case 'Graded': return "default";
         case 'Submitted': return "secondary";
         case 'In Progress': return "outline";
         default: return "outline";
     }
 }

 function isCorrect(userAnswer: SubmissionAnswer['answer'], correctAnswer: Question['correctAnswer']): boolean {
    if (correctAnswer === undefined || userAnswer === null) return false;
    if (Array.isArray(correctAnswer)) {
        if (!Array.isArray(userAnswer)) return false;
        return userAnswer.length === correctAnswer.length && [...userAnswer].sort().every((val, index) => val === [...correctAnswer].sort()[index]);
    }
    return String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase();
 }

 function getAnswerDisplayClass(userAnswer: SubmissionAnswer['answer'], correctAnswer: Question['correctAnswer']): string {
    if (userAnswer === null || userAnswer === undefined) return 'text-muted-foreground italic';
    if (correctAnswer === undefined) return ''; // No correct answer defined (e.g., essay)
    return isCorrect(userAnswer, correctAnswer) ? 'text-green-600 font-medium' : 'text-red-600';
 }

 function getAnswerIcon(userAnswer: SubmissionAnswer['answer'], correctAnswer: Question['correctAnswer']) {
    if (userAnswer === null || userAnswer === undefined) return <HelpCircle className="h-4 w-4 text-muted-foreground inline-block ml-1" />;
     if (correctAnswer === undefined) return null;
    return isCorrect(userAnswer, correctAnswer)
      ? <Check className="h-4 w-4 text-green-600 inline-block ml-1" />
      : <X className="h-4 w-4 text-red-600 inline-block ml-1" />;
 }

 function formatAnswer(answer: SubmissionAnswer['answer']): string {
     if (answer === null || answer === undefined) return 'No Answer';
     if (Array.isArray(answer)) return answer.join(', ');
     return String(answer);
 }

export default function SubmissionDetailsPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;
  const router = useRouter();

  const { data: submission, isLoading: isLoadingSubmission, error: errorSubmission } = useFirestoreDocument<Submission>(
    ['submission', submissionId],
    { path: `submissions/${submissionId}`, enabled: !!submissionId, listen: true }
  );

   // Extract question IDs from the submission answers if available, otherwise fallback to testConfigSnapshot
   const questionIds = useMemo(() => {
       return submission?.answers?.map(a => a.questionId) ?? [];
       // Consider fetching test document if answers or snapshot are missing
   }, [submission?.answers]);

   // Fetch Questions based on the IDs derived above
   const { data: questions, isLoading: isLoadingQuestions, error: errorQuestions } = useFirestoreQuery<Question>(
     ['questions', submissionId], // Use submissionId in key for uniqueness if needed
     {
       path: 'questions',
       enabled: questionIds.length > 0,
     }
   );

    const testQuestions = useMemo(() => {
      if (!questions || questionIds.length === 0) return [];
      const questionMap = new Map(questions.map(q => [q.id, q]));
      // Preserve order from submission answers if possible
      return questionIds.map(id => questionMap.get(id)).filter(q => q !== undefined) as Question[];
    }, [questions, questionIds]);

    const answersMap = useMemo(() => {
      const map = new Map<string, SubmissionAnswer>(); // Store the whole answer object
      submission?.answers?.forEach(ans => map.set(ans.questionId, ans));
      return map;
    }, [submission?.answers]);


  const isLoading = isLoadingSubmission || (questionIds.length > 0 && isLoadingQuestions);
  const error = errorSubmission || errorQuestions;

   if (isLoading) return <LoadingSkeleton />;

   if (error) {
     return (
       <Alert variant="destructive">
         <AlertTriangle className="h-4 w-4" />
         <AlertTitle>Error Loading Submission Details</AlertTitle>
         <AlertDescription>{error.message}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>Go Back</Button>
       </Alert>
     );
   }

   if (!submission) {
     return (
       <Alert>
         <AlertTriangle className="h-4 w-4" />
         <AlertTitle>Submission Not Found</AlertTitle>
         <AlertDescription>
           The submission details could not be loaded.
           <Button variant="link" asChild className="p-0 h-auto ml-1">
             <Link href="/admin/submissions">Go back to submissions list.</Link>
           </Button>
         </AlertDescription>
       </Alert>
     );
   }

    let durationString = 'N/A';
    if (submission.startedAt && submission.submittedAt) {
        try {
            durationString = formatDistanceStrict(submission.submittedAt.toDate(), submission.startedAt.toDate());
        } catch (e) { console.error("Error formatting duration:", e)}
    } else if (submission.timeTakenSeconds) {
         const minutes = Math.floor(submission.timeTakenSeconds / 60);
         const seconds = submission.timeTakenSeconds % 60;
         durationString = `${minutes}m ${seconds}s`;
    }


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
         <Button variant="outline" size="icon" asChild>
           <Link href="/admin/submissions">
             <ArrowLeft className="h-4 w-4" />
             <span className="sr-only">Back to Submissions</span>
           </Link>
         </Button>
        <h1 className="text-3xl font-bold">Submission Details</h1>
      </div>

       <Card className="overflow-hidden">
         <CardHeader className="bg-muted/50">
           <CardTitle className="text-xl">{submission.testTitle || 'Test Submission'}</CardTitle>
           <CardDescription>
             Submitted by <span className="font-medium">{submission.userName || 'Unknown User'}</span>
           </CardDescription>
         </CardHeader>
         <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <div className="flex items-center gap-2">
               <User className="h-4 w-4 text-muted-foreground" />
               <span className="font-medium">Candidate:</span> {submission.userName || submission.userId}
            </div>
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Submitted:</span>
                {submission.submittedAt ? format(submission.submittedAt.toDate(), 'PPpp') : 'In Progress'}
            </div>
             <div className="flex items-center gap-2">
               <Clock className="h-4 w-4 text-muted-foreground" />
               <span className="font-medium">Duration:</span> {durationString}
             </div>
             <div className="flex items-center gap-2 col-span-1 md:col-span-1"> {/* Score Percentage */}
                 <TrendingUp className="h-4 w-4 text-muted-foreground" />
                 <span className="font-medium">Score (%):</span>
                 {submission.score !== null ? (
                     <Badge variant={getScoreBadgeVariant(submission.score)} className="text-base px-3 py-0.5">
                         {submission.score}%
                     </Badge>
                 ) : (
                     <Badge variant="outline" className="text-base px-3 py-0.5">Not Graded</Badge>
                 )}
             </div>
              <div className="flex items-center gap-2 col-span-1 md:col-span-1"> {/* Total Points */}
                  <Target className="h-4 w-4 text-muted-foreground" />
                 <span className="font-medium">Points:</span>
                  {(submission.totalPointsAwarded !== undefined && submission.maxPossiblePoints !== undefined) ? (
                      <span className="text-foreground font-medium">
                          {submission.totalPointsAwarded} / {submission.maxPossiblePoints}
                      </span>
                  ) : submission.status === 'Graded' ? (
                        <span className="text-muted-foreground italic text-xs">Points data unavailable</span>
                    ) : (
                        <span className="text-muted-foreground">-- / --</span>
                  )}
              </div>
            <div className="flex items-center gap-2 capitalize"> {/* Status */}
               <span className="font-medium">Status:</span>
                <Badge variant={getStatusBadgeVariant(submission.status)} className="text-base px-3 py-0.5">
                    {submission.status === 'Submitted' ? 'Pending Grade' : submission.status}
                </Badge>
            </div>
         </CardContent>
         <CardFooter className="bg-muted/50 p-4 flex justify-end">
              {submission.status === 'Submitted' && (
                 <Button asChild>
                    <Link href={`/admin/submissions/grade/${submission.id}`}>
                        <Pencil className="mr-2 h-4 w-4" /> Grade Submission
                    </Link>
                  </Button>
              )}
               {submission.status === 'Graded' && (
                 <Button variant="outline" asChild>
                    <Link href={`/admin/submissions/grade/${submission.id}`}>
                        <Pencil className="mr-2 h-4 w-4" /> View/Edit Grade
                    </Link>
                  </Button>
              )}
         </CardFooter>
       </Card>

       <Card>
         <CardHeader>
           <CardTitle>Answers & Grading</CardTitle>
            <CardDescription>Review of the candidate's answers and assigned points.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           {isLoadingQuestions ? (
             <div className="space-y-4">
                <Skeleton className="h-20 w-full" /> <Skeleton className="h-20 w-full" /> <Skeleton className="h-20 w-full" />
             </div>
           ) : testQuestions.length > 0 ? (
             testQuestions.map((question, index) => {
                const submissionAnswer = answersMap.get(question.id!); // Get the full SubmissionAnswer object
                const userAnswer = submissionAnswer?.answer; // Extract user's answer
                const assignedScore = submissionAnswer?.score; // Extract assigned score (points)
                const feedback = submissionAnswer?.feedback; // Extract feedback
                const isMC = question.type === 'multiple-choice';
                const correctAnswer = question.correctAnswer;
                const answerClass = getAnswerDisplayClass(userAnswer, correctAnswer);
                const answerIcon = getAnswerIcon(userAnswer, correctAnswer);
                const maxPoints = submission?.testConfigSnapshot?.pointsPerQuestion ?? question.pointsPerQuestion ?? 1; // Get max points

               return (
                 <div key={question.id} className="pb-6 border-b last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                         <p className="font-semibold flex-grow pr-4">Q{index + 1}: {question.text}</p>
                         <Badge variant="outline" className="text-xs">Max: {maxPoints} pt(s)</Badge>
                    </div>
                     {question.imageUrl && (
                         <div className="relative w-full max-w-xs mb-3 rounded-md overflow-hidden border">
                             <Image src={question.imageUrl} alt={`Question ${index + 1} image`} width={400} height={300} objectFit="contain" />
                         </div>
                     )}

                   {isMC && question.options && (
                      <div className="space-y-1 text-sm pl-4 mb-2">
                          {question.options.map(opt => (
                              <p key={opt.id} className={cn(
                                 "flex items-center gap-2",
                                 String(userAnswer) === opt.id && "font-medium", // Highlight user's choice
                                 String(correctAnswer) === opt.id && "text-green-700 font-bold" // Highlight correct answer
                               )}
                              >
                                  {String(correctAnswer) === opt.id && <Check className="h-4 w-4 text-green-600 flex-shrink-0"/>}
                                  {String(userAnswer) === opt.id && String(correctAnswer) !== opt.id && <X className="h-4 w-4 text-red-600 flex-shrink-0"/>}
                                   <span className={cn(String(userAnswer) !== opt.id && String(correctAnswer) !== opt.id && "ml-6", "text-muted-foreground")}>
                                    {opt.text}
                                  </span>
                              </p>
                          ))}
                      </div>
                    )}

                   <p className={cn("text-sm pl-4", answerClass)}>
                     <strong>Answer:</strong> {formatAnswer(userAnswer)}
                     {answerIcon}
                   </p>
                    {/* Show assigned score and feedback */}
                    <div className="pl-4 mt-2 space-y-1 text-xs">
                        <p><strong>Points Awarded:</strong> {assignedScore ?? <span className="italic text-muted-foreground">Not graded</span>}</p>
                         {feedback && <p><strong>Feedback:</strong> <span className="italic text-muted-foreground">{feedback}</span></p>}
                    </div>
                    {/* Show correct answer if different and defined (for non-essay) */}
                   {correctAnswer !== undefined && !isCorrect(userAnswer, correctAnswer) && question.type !== 'essay' && (
                      <p className="text-sm pl-4 text-green-700 mt-1">
                        <strong>Correct:</strong> {formatAnswer(correctAnswer)}
                      </p>
                    )}
                     {question.type !== 'multiple-choice' && correctAnswer !== undefined && (
                      <p className="text-xs pl-4 text-muted-foreground mt-1 italic">
                        <strong>Reference:</strong> {formatAnswer(correctAnswer)}
                      </p>
                     )}
                 </div>
               );
             })
           ) : (
              <p className="text-muted-foreground text-center py-4">Could not load question details for this submission.</p>
           )}
         </CardContent>
       </Card>

    </motion.div>
  );
}