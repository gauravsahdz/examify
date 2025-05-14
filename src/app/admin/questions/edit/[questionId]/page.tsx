
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuestionForm from '@/components/admin/QuestionForm'; // Use a shared form component
import { useFirestoreDocument } from '@/hooks/useFirestoreQuery';
import type { Question } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const FormSkeleton = () => (
   <div className="space-y-6">
     <Skeleton className="h-6 w-1/4" />
     <Skeleton className="h-20 w-full" /> {/* Textarea */}
     <Skeleton className="h-16 w-full" /> {/* Image upload */}
     <div className="grid grid-cols-3 gap-6">
       <Skeleton className="h-10 w-full" />
       <Skeleton className="h-10 w-full" />
       <Skeleton className="h-10 w-full" />
     </div>
     <Skeleton className="h-20 w-full" /> {/* Options/Answer */}
     <Skeleton className="h-10 w-32" /> {/* Submit button */}
   </div>
 );


export default function EditQuestionPage() {
  const params = useParams();
  const questionId = params.questionId as string;
  const router = useRouter();

  const { data: question, isLoading, error } = useFirestoreDocument<Question>(
    ['question', questionId], // Unique query key for this document
    {
      path: `questions/${questionId}`, // Path to the specific document
      enabled: !!questionId, // Only run query if questionId exists
      listen: true, // Listen for real-time updates
    }
  );

  return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.5 }}
       className="space-y-6"
    >
       <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/questions">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Questions</span>
            </Link>
          </Button>
         <h1 className="text-3xl font-bold">Edit Question</h1>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Update Question Details</CardTitle>
          <CardDescription>Modify the details for the question.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <FormSkeleton />}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Question</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
           {!isLoading && !error && !question && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Question Not Found</AlertTitle>
                <AlertDescription>
                   The question you are trying to edit does not exist or could not be loaded.
                   <Button variant="link" asChild className="p-0 h-auto ml-1">
                     <Link href="/admin/questions">Go back to questions list.</Link>
                   </Button>
                </AlertDescription>
              </Alert>
           )}
           {!isLoading && !error && question && (
            // Pass the full question object, including imageUrl if present
            <QuestionForm initialData={question} />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
    