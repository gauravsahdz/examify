
'use client';

import React from 'react';
import QuestionForm from '@/components/admin/QuestionForm'; // Use a shared form component
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewQuestionPage() {

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
         <h1 className="text-3xl font-bold">Create New Question</h1>
       </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
          <CardDescription>Fill in the details for the new question.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionForm /> {/* Render the form without initial data */}
        </CardContent>
      </Card>
    </motion.div>
  );
}
    