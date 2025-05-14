
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import TestForm from '@/components/admin/TestForm'; // Use the shared form component
import { useFirestoreDocument } from '@/hooks/useFirestoreQuery';
import type { Test } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react'; // Added Loader2
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

// Skeleton loader for the form
const FormSkeleton = () => (
   <div className="space-y-6">
     <Skeleton className="h-6 w-1/4" />
     <Skeleton className="h-10 w-full" />
     <Skeleton className="h-6 w-1/4" />
     <Skeleton className="h-10 w-full" />
     <Skeleton className="h-6 w-1/4" />
     <Skeleton className="h-40 w-full" /> {/* Placeholder for question selector */}
     <Skeleton className="h-10 w-32" />
   </div>
 );

export default function EditTestPage() {
  const params = useParams();
  const testId = params.testId as string;
  const router = useRouter();

  // Fetch the specific test document
  const { data: test, isLoading, error } = useFirestoreDocument<Test>(
    ['test', testId], // Unique query key for this document
    {
      path: `tests/${testId}`, // Path to the specific document
      enabled: !!testId, // Only run query if testId exists
      listen: true, // Listen for real-time updates (optional)
    }
  );

  return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.5 }}
       className="space-y-6"
    >
       {/* Page Header */}
       <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild aria-label="Back to Tests">
            <Link href="/admin/tests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
         <h1 className="text-3xl font-bold">Edit Test</h1>
       </div>

       {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Update Test Details</CardTitle>
          <CardDescription>Modify the test settings and selected questions.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {isLoading && <FormSkeleton />}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Test</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {/* Not Found State */}
           {!isLoading && !error && !test && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Test Not Found</AlertTitle>
                <AlertDescription>
                   The test you are trying to edit does not exist or could not be loaded.
                   <Button variant="link" asChild className="p-0 h-auto ml-1">
                     <Link href="/admin/tests">Go back to tests list.</Link>
                   </Button>
                </AlertDescription>
              </Alert>
           )}

           {/* Success State - Render Form */}
           {!isLoading && !error && test && (
            <TestForm initialData={test} />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
