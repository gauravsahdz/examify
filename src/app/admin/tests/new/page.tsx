
'use client';

import React from 'react';
import TestForm from '@/components/admin/TestForm'; // Use the shared form component
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewTestPage() {
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
         <h1 className="text-3xl font-bold">Create New Test</h1>
       </div>

       {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Details</CardTitle>
          <CardDescription>Fill in the details for the new test and select questions.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Render the form without initial data for creation */}
          <TestForm />
        </CardContent>
      </Card>
    </motion.div>
  );
}
