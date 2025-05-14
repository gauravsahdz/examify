
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Play, Loader2, AlertTriangle, Timer, Shuffle, Camera } from "lucide-react";
import type { Test } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useDeleteDocument } from '@/hooks/useFirestoreMutation';
import { format } from 'date-fns';
import Link from 'next/link';
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
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/services/log.service';

function getStatusBadgeVariant(status: Test['status']): "default" | "secondary" | "outline" {
  switch (status) {
    case 'Active': return "default";
    case 'Draft': return "secondary";
    case 'Archived': return "outline";
    default: return "outline";
  }
}

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell className="space-x-1"><Skeleton className="inline-block h-5 w-5" /><Skeleton className="inline-block h-5 w-5" /><Skeleton className="inline-block h-5 w-5" /></TableCell>
    <TableCell className="text-right space-x-1">
      <Skeleton className="inline-block h-8 w-8 rounded" />
      <Skeleton className="inline-block h-8 w-8 rounded" />
      <Skeleton className="inline-block h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);

const ConfigIndicator = ({ enabled, Icon, label }: { enabled?: boolean; Icon: React.ElementType; label: string }) => {
   if (enabled === undefined) return null;
   const title = `${label}: ${enabled ? 'On' : 'Off'}`;
   return (
      <Icon className={enabled ? "h-4 w-4 text-green-600" : "h-4 w-4 text-muted-foreground opacity-50"} title={title} />
   );
};

export default function TestsPage() {
   const { toast } = useToast();
   const { user, userProfile, isAdmin } = useAuth(); // Added isAdmin

   const { data: tests, isLoading, error } = useFirestoreQuery<Test>(
    ['tests'],
    {
        path: 'tests',
        listen: true,
        constraints: [orderBy('createdAt', 'desc')]
    }
  );

   const deleteMutation = useDeleteDocument<Test>({
     collectionPath: 'tests',
     invalidateQueries: [['tests']],
     onSuccess: async (voidResponse, variables) => {
       toast({ title: "Test Deleted", description: "The test has been successfully deleted." });
       if (user && userProfile) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Deleted Test',
            entityType: 'Test',
            entityId: variables.id,
            details: { testTitle: variables.deletedEntityTitle || 'N/A' }
        });
      }
     },
     onError: (error) => {
       toast({ title: "Deletion Failed", description: error.message || "Could not delete the test.", variant: "destructive" });
     }
   });

   const handleDelete = (test: Test | undefined) => {
     if (!test || !test.id || !isAdmin) {
        toast({ title: "Permission Denied", description: "You do not have permission to delete tests.", variant: "destructive" });
        return;
     }
     deleteMutation.mutate({
        id: test.id,
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined,
        deletedEntityTitle: test.title
     });
   };

  if (error) return <p className="text-destructive p-4">Error loading tests: {error.message}</p>;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <h1 className="text-3xl font-bold">Manage Tests</h1>
         <Button asChild disabled={!isAdmin}>
           <Link href="/admin/tests/new">
             <PlusCircle className="mr-2 h-4 w-4" /> Create New Test
           </Link>
         </Button>
      </motion.div>

       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader>
            <CardTitle>Test Library</CardTitle>
            <CardDescription>Browse, manage, and create all tests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Title</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}

                {!isLoading && tests && tests.length > 0 && tests.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.title}</TableCell>
                      <TableCell>{test.questionIds?.length ?? 0}</TableCell>
                      <TableCell>{test.durationMinutes} mins</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(test.status)} className="capitalize">
                          {test.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{test.createdAt ? format(test.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1.5">
                           <ConfigIndicator enabled={test.showTimer} Icon={Timer} label="Timer"/>
                           <ConfigIndicator enabled={test.shuffleQuestions} Icon={Shuffle} label="Shuffle"/>
                           <ConfigIndicator enabled={test.webcamEnabled} Icon={Camera} label="Webcam"/>
                         </div>
                       </TableCell>
                      <TableCell className="text-right space-x-1">
                         <Button variant="ghost" size="icon" asChild title="Preview Test">
                           <Link href={`/test/${test.id}`} target="_blank" rel="noopener noreferrer">
                             <Play className="h-4 w-4" />
                           </Link>
                         </Button>
                         <Button variant="ghost" size="icon" asChild title="Edit Test" disabled={!isAdmin}>
                            <Link href={`/admin/tests/edit/${test.id}`}>
                              <Edit className="h-4 w-4" />
                           </Link>
                         </Button>
                         <AlertDialog>
                           <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive" 
                                title="Delete Test" 
                                disabled={deleteMutation.isPending && deleteMutation.variables?.id === test.id || !isAdmin} // Disable if not admin
                              >
                                {deleteMutation.isPending && deleteMutation.variables?.id === test.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                              </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                               <AlertDialogDescription>
                                 This action cannot be undone. This will permanently delete the test '{test.title}'. Related submissions might also be affected.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction
                                 onClick={() => handleDelete(test)}
                                 className="bg-destructive hover:bg-destructive/90"
                                 disabled={deleteMutation.isPending || !isAdmin}
                               >
                                 {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                 Delete
                               </AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!isLoading && (!tests || tests.length === 0) && (
                   <TableRow>
                     <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                       No tests found. <Link href="/admin/tests/new" className="text-primary hover:underline">Create one?</Link>
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

