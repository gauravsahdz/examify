
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { CheckCircle, Clock, Trash2, Eye, Sparkles, Loader2, AlertTriangle, Archive, RotateCcw, MessageSquare, Lock } from "lucide-react";
import { summarizeFeedback } from '@/ai/flows/summarize-feedback';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useUpdateDocument, useDeleteDocument } from '@/hooks/useFirestoreMutation';
import type { Feedback } from '@/lib/types';
import { PLAN_LIMITS, SubscriptionPlan } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { where, orderBy } from 'firebase/firestore';
import { type VariantProps } from "class-variance-authority";
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/services/log.service';

type FeedbackStatus = Feedback['status'];
type Summary = { title: string; summary: string; keyThemes: string };

const statusOptions: CustomSelectOption[] = [
    { value: "all", label: "All Statuses" },
    { value: "Pending", label: "Pending" },
    { value: "Reviewed", label: "Reviewed" },
    { value: "Resolved", label: "Resolved" },
    { value: "Archived", label: "Archived" },
];

function getStatusIcon(status: FeedbackStatus) {
  switch (status) {
    case 'Pending': return <Clock className="h-4 w-4 text-orange-500" />;
    case 'Resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Reviewed': return <Eye className="h-4 w-4 text-blue-500" />;
    case 'Archived': return <Archive className="h-4 w-4 text-muted-foreground" />;
    default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: FeedbackStatus): VariantProps<typeof badgeVariants>["variant"] {
    switch (status) {
        case 'Pending': return "destructive";
        case 'Reviewed': return "default";
        case 'Resolved': return "secondary";
        case 'Archived': return "outline";
        default: return "outline";
    }
}

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell className="text-right space-x-1">
      <Skeleton className="inline-block h-8 w-8 rounded" />
      <Skeleton className="inline-block h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);


export default function FeedbackPage() {
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const { user, userProfile, isAdmin } = useAuth(); // Added isAdmin

  const currentPlan = userProfile?.subscriptionPlanId ?? SubscriptionPlan.FREE;
  const limits = PLAN_LIMITS[currentPlan];
  const isAiSummarizationEnabled = limits.aiFeedbackSummary;


  const queryConstraints = useMemo(() => {
      if (filterStatus === 'all') return [orderBy('receivedAt', 'desc')];
      return [where('status', '==', filterStatus), orderBy('receivedAt', 'desc')];
  }, [filterStatus]);

  const { data: feedbackItems, isLoading, error } = useFirestoreQuery<Feedback>(
    ['feedback', filterStatus],
    {
        path: 'feedback',
        constraints: queryConstraints,
        listen: true
    }
  );

   const updateFeedback = useUpdateDocument<Feedback>({
       collectionPath: 'feedback',
       invalidateQueries: [['feedback', filterStatus], ['feedback', 'all']],
       onSuccess: async (voidResponse, variables) => {
            toast({ title: "Feedback Updated", description: "Status changed successfully." });
            if (user && userProfile && selectedFeedback) {
                await logActivity({
                    userId: user.uid,
                    userName: userProfile.displayName || user.email || 'Unknown User',
                    action: 'Updated Feedback Status',
                    entityType: 'Feedback',
                    entityId: selectedFeedback.id,
                    details: { subject: selectedFeedback.subject, oldStatus: selectedFeedback.status, newStatus: variables.data.status }
                });
            }
       },
       onError: (err) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
   });

   const deleteFeedback = useDeleteDocument<Feedback>({
      collectionPath: 'feedback',
      invalidateQueries: [['feedback', filterStatus], ['feedback', 'all']],
      onSuccess: async (voidResponse, variables) => {
            toast({ title: "Feedback Deleted", description: "Feedback removed successfully." });
            if (user && userProfile && feedbackToDelete) { // Use feedbackToDelete as context
                await logActivity({
                    userId: user.uid,
                    userName: userProfile.displayName || user.email || 'Unknown User',
                    action: 'Deleted Feedback',
                    entityType: 'Feedback',
                    entityId: variables.id, // variables.id is the ID passed to mutate
                    details: { subject: variables.deletedEntityTitle || feedbackToDelete.subject }
                });
            }
      },
      onError: (err) => toast({ title: "Delete Failed", description: err.message, variant: "destructive" }),
   });


  const handleViewDetails = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setSummary(null);
  };

  const handleSummarize = async () => {
    if (!selectedFeedback || !isAdmin) {
        toast({
            title: "Permission Denied",
            description: "You do not have permission to summarize feedback.",
            variant: "destructive",
        });
        return;
    }
    if (!isAiSummarizationEnabled) {
         toast({
            title: "Feature Unavailable",
            description: "AI Feedback Summarization requires a Pro or Enterprise plan.",
            variant: "destructive",
        });
        return;
    }
    setIsSummarizing(true);
    setSummary(null);
    try {
      const result = await summarizeFeedback({
        feedbackText: selectedFeedback.feedback,
        questionOrTest: selectedFeedback.subject,
      });
      setSummary({
        title: `AI Summary for: ${selectedFeedback.subject}`,
        summary: result.summary,
        keyThemes: result.keyThemes,
      });
      if (user && userProfile) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Generated AI Feedback Summary',
            entityType: 'Feedback',
            entityId: selectedFeedback.id,
            details: { subject: selectedFeedback.subject }
        });
      }
    } catch (error) {
      console.error("Error summarizing feedback:", error);
      toast({
        title: "Summarization Failed",
        description: "Could not generate summary. Please check API configuration and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

   const handleChangeStatus = (newStatus: FeedbackStatus) => {
     if (!selectedFeedback || !selectedFeedback.id || !isAdmin) {
        toast({ title: "Permission Denied", description: "You do not have permission to change feedback status.", variant: "destructive" });
        return;
     }
     const oldStatus = selectedFeedback.status; // Capture old status before update
     updateFeedback.mutate({ 
        id: selectedFeedback.id, 
        data: { status: newStatus },
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined, 
      });
     setSelectedFeedback(prev => prev ? { ...prev, status: newStatus } : null);
   };

   const handleDeleteClick = (feedback: Feedback) => {
      if (!isAdmin) {
          toast({ title: "Permission Denied", description: "You do not have permission to delete feedback.", variant: "destructive" });
          return;
      }
      setFeedbackToDelete(feedback);
   }

   const confirmDeleteFeedback = () => {
      if (!feedbackToDelete || !feedbackToDelete.id || !isAdmin) return;
      deleteFeedback.mutate({
        id: feedbackToDelete.id,
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined,
        deletedEntityTitle: feedbackToDelete.subject // Pass subject for logging
      });
      setFeedbackToDelete(null);
      if(selectedFeedback?.id === feedbackToDelete.id) {
          handleCloseDialog();
      }
   }


  const handleCloseDialog = () => {
    setSelectedFeedback(null);
    setSummary(null);
  }

  return (
    <div className="space-y-6">
       <motion.h1
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
         className="text-3xl font-bold"
       >
         Manage Feedback
       </motion.h1>

      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>User Feedback</CardTitle>
              <CardDescription>Review and address user comments and suggestions.</CardDescription>
            </div>
            <div className="w-[180px]">
                <CustomSelect
                    value={filterStatus}
                    onValueChange={(value) => setFilterStatus(value as FeedbackStatus | 'all')}
                    options={statusOptions}
                    placeholder="Filter by status..."
                 />
            </div>
          </CardHeader>
          <CardContent>
             {error && <p className="text-destructive text-center py-4">Error loading feedback: {error.message}</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : feedbackItems && feedbackItems.length > 0 ? (
                  feedbackItems.map((fb) => (
                    <TableRow key={fb.id}>
                      <TableCell className="font-medium">{fb.userName || fb.userId}</TableCell>
                      <TableCell className="max-w-sm truncate">{fb.subject}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(fb.status)} className="capitalize">
                            <div className="flex items-center gap-1.5">
                                {getStatusIcon(fb.status)}
                                {fb.status}
                            </div>
                        </Badge>
                      </TableCell>
                      <TableCell>{fb.receivedAt ? format(fb.receivedAt.toDate(), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="View Details" onClick={() => handleViewDetails(fb)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Delete Feedback"
                            onClick={() => handleDeleteClick(fb)}
                            disabled={deleteFeedback.isPending && deleteFeedback.variables?.id === fb.id || !isAdmin} // Disable if not admin
                        >
                            {deleteFeedback.isPending && deleteFeedback.variables?.id === fb.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No feedback found{filterStatus !== 'all' ? ` with status "${filterStatus}"` : ''}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

       <AlertDialog open={!!feedbackToDelete} onOpenChange={(open) => !open && setFeedbackToDelete(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to delete this feedback from "{feedbackToDelete?.userName}" regarding "{feedbackToDelete?.subject}"? This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setFeedbackToDelete(null)} disabled={deleteFeedback.isPending || !isAdmin}>Cancel</AlertDialogCancel>
             <AlertDialogAction onClick={confirmDeleteFeedback} className="bg-destructive hover:bg-destructive/90" disabled={deleteFeedback.isPending || !isAdmin}>
               {deleteFeedback.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
               Delete
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>


      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
                Reviewing feedback on: <span className="font-medium">{selectedFeedback?.subject}</span>
            </DialogDescription>
          </DialogHeader>
           <Separator />
           <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
            <div className="py-4 space-y-4 ">
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <p><strong>From:</strong> {selectedFeedback?.userName || 'Unknown'}</p>
                 <p><strong>Received:</strong> {selectedFeedback?.receivedAt ? format(selectedFeedback.receivedAt.toDate(), 'PPpp') : 'N/A'}</p>
                 <p><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedFeedback?.status ?? 'Pending')} className="capitalize">{selectedFeedback?.status}</Badge></p>
                 <p><strong>User Email:</strong> {selectedFeedback?.userEmail || 'Not provided'}</p>
               </div>
                <Separator />
               <p><strong>Feedback:</strong></p>
               <blockquote className="text-sm p-4 bg-muted rounded-md border-l-4 border-primary whitespace-pre-wrap">
                  {selectedFeedback?.feedback}
                </blockquote>

              {summary && (
                <Card className="mt-4 border-primary/50">
                   <CardHeader className="pb-2">
                     <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Summary & Analysis</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-3 text-sm">
                      <div>
                         <strong className="block mb-1">Summary:</strong>
                         <p>{summary.summary}</p>
                       </div>
                       <div>
                         <strong className="block mb-1">Key Themes:</strong>
                         <p>{summary.keyThemes}</p>
                       </div>
                   </CardContent>
                 </Card>
               )}

                {!summary && !isSummarizing && (
                    <Button onClick={handleSummarize} size="sm" className="mt-2" disabled={!isAiSummarizationEnabled || !isAdmin}>
                        {!isAiSummarizationEnabled ? <Lock className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {isAiSummarizationEnabled && isAdmin ? 'Generate AI Summary' : (!isAdmin ? 'Admin Only' : 'Upgrade for Summary')}
                    </Button>
                )}
                {isSummarizing && (
                  <Button disabled size="sm" className="mt-2">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...
                  </Button>
                )}
            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-auto">
             <div className="flex gap-2 flex-wrap">
                 {(['Pending', 'Reviewed', 'Resolved', 'Archived'] as FeedbackStatus[]).map(status => (
                     selectedFeedback?.status !== status && (
                         <Button
                            key={status}
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeStatus(status)}
                            disabled={updateFeedback.isPending || !isAdmin} // Disable if not admin
                            className="capitalize"
                         >
                             {updateFeedback.isPending && updateFeedback.variables?.data.status === status ? <Loader2 className="h-4 w-4 animate-spin" /> :
                              status === 'Resolved' ? <CheckCircle className="mr-1 h-4 w-4 text-green-500"/> :
                              status === 'Archived' ? <Archive className="mr-1 h-4 w-4"/> :
                              status === 'Reviewed' ? <Eye className="mr-1 h-4 w-4"/> :
                              <RotateCcw className="mr-1 h-4 w-4"/>
                             }
                            Mark as {status}
                         </Button>
                     )
                 ))}
             </div>
              <DialogClose asChild>
                <Button variant="ghost">Close</Button>
             </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

