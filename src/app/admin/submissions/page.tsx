
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Percent, CheckCircle, XCircle, Clock, Loader2, AlertTriangle, UserCheck, Download } from "lucide-react"; // Added Download
import { Button } from "@/components/ui/button";
import type { Submission } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx'; // Import xlsx library
import { useAuth } from '@/context/AuthContext';

function getScoreBadgeVariant(score: number | null): "default" | "secondary" | "destructive" | "outline" {
  if (score === null) return "outline";
  if (score >= 90) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
}

function getStatusIcon(status: Submission['status']) {
  switch (status) {
    case 'Graded': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Submitted': return <Clock className="h-4 w-4 text-blue-500" />;
    case 'In Progress': return <Percent className="h-4 w-4 text-orange-500 animate-pulse" />;
    default: return <XCircle className="h-4 w-4 text-destructive" />;
  }
}

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    {/* <TableCell><Skeleton className="h-4 w-20" /></TableCell> Add skeleton for Graded By */}
    <TableCell className="text-right">
      <Skeleton className="inline-block h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);

export default function SubmissionsPage() {
   const { isAdmin } = useAuth();
   const { data: submissions, isLoading, error } = useFirestoreQuery<Submission>(
    ['submissions'],
    {
      path: 'submissions',
      listen: true,
      constraints: [orderBy('submittedAt', 'desc')]
    }
  );

  if (error) return <p className="text-destructive">Error loading submissions: {error.message}</p>;

  const formatOptionalDate = (timestamp: Submission['submittedAt']) => {
    if (!timestamp) return <span className="text-muted-foreground">Not Submitted</span>;
    const date = timestamp.toDate();
    return (
       <span title={format(date, 'PPpp')}>
         {formatDistanceToNow(date, { addSuffix: true })}
       </span>
    );
   };

   const handleDownloadReport = () => {
    if (!submissions || submissions.length === 0 || !isAdmin) return;

    const reportData = submissions.map(sub => ({
        'User Name': sub.userName,
        'Test Title': sub.testTitle,
        'Status': sub.status,
        'Score (%)': sub.score ?? 'N/A',
        'Points Awarded': sub.totalPointsAwarded ?? 'N/A',
        'Max Points': sub.maxPossiblePoints ?? 'N/A',
        'Submitted At': sub.submittedAt ? format(sub.submittedAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        'Started At': sub.startedAt ? format(sub.startedAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        'Graded At': sub.gradedAt ? format(sub.gradedAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        'Time Taken (s)': sub.timeTakenSeconds ?? 'N/A',
        // Consider adding a summary of answers if feasible or number of correct/incorrect
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions Report");

    // Set column widths (optional, for better readability)
    const columnWidths = [
        { wch: 20 }, // User Name
        { wch: 30 }, // Test Title
        { wch: 15 }, // Status
        { wch: 10 }, // Score
        { wch: 15 }, // Points Awarded
        { wch: 10 }, // Max Points
        { wch: 20 }, // Submitted At
        { wch: 20 }, // Started At
        { wch: 20 }, // Graded At
        { wch: 15 }, // Time Taken
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.writeFile(workbook, `Submissions_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
   };


  return (
    <div className="space-y-6">
       <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
         className="flex flex-wrap justify-between items-center gap-4"
       >
         <h1 className="text-3xl font-bold">Manage Submissions</h1>
         <Button onClick={handleDownloadReport} disabled={isLoading || !submissions || submissions.length === 0 || !isAdmin}>
            <Download className="mr-2 h-4 w-4" /> Download Report
         </Button>
       </motion.div>


      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader>
            <CardTitle>Recent Test Submissions</CardTitle>
            <CardDescription>View and manage submitted tests. Status updates in real-time.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  {/* <TableHead>Graded By</TableHead> Optional: Add if tracking grader */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : submissions && submissions.length > 0 ? (
                  submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.userName || sub.userId}</TableCell>
                      <TableCell>{sub.testTitle || sub.testId}</TableCell>
                      <TableCell>{formatOptionalDate(sub.submittedAt)}</TableCell>
                      <TableCell>
                        {sub.score !== null ? (
                           <Badge variant={getScoreBadgeVariant(sub.score)}>
                             {sub.score}%
                           </Badge>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 capitalize">
                          {getStatusIcon(sub.status)}
                          {sub.status === 'Submitted' ? 'Pending Grade' : sub.status}
                         </div>
                      </TableCell>
                       {/* Optional Graded By cell */}
                      {/* <TableCell className="text-xs text-muted-foreground">
                         {sub.status === 'Graded' && sub.graderInfo ? (
                            <span className="flex items-center gap-1"><UserCheck className="h-3 w-3"/> {sub.graderInfo.name}</span>
                         ) : sub.status === 'Graded' ? ('Auto/Unknown') : ('N/A')}
                       </TableCell> */}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild title="View Submission">
                          <Link href={`/admin/submissions/${sub.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                         {sub.status === 'Submitted' && isAdmin && (
                          <Button variant="link" size="sm" asChild className="ml-1 p-0 h-auto text-primary">
                             <Link href={`/admin/submissions/grade/${sub.id}`}>Grade</Link>
                           </Button>
                         )}
                         {sub.status === 'Graded' && isAdmin && (
                           <Button variant="link" size="sm" asChild className="ml-1 p-0 h-auto text-primary">
                             <Link href={`/admin/submissions/grade/${sub.id}`}>View/Edit Grade</Link>
                           </Button>
                         )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground"> {/* Updated colspan */}
                      No submissions found yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
       </motion.div>
    </div>
  );
}

