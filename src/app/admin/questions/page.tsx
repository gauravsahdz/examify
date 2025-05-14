
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Loader2, Image as ImageIcon, Filter, Folder } from "lucide-react";
import { QuestionDifficulty } from "@/lib/enums";
import type { Question } from '@/lib/types';
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
  // AlertDialogTrigger, // No longer used here as dialog is state-controlled
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/services/log.service';


function getDifficultyBadgeVariant(difficulty: QuestionDifficulty): "default" | "secondary" | "destructive" | "outline" {
  switch (difficulty) {
    case QuestionDifficulty.EASY: return "secondary";
    case QuestionDifficulty.MEDIUM: return "default";
    case QuestionDifficulty.HARD: return "destructive";
    default: return "outline";
  }
}

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-10 w-10" /></TableCell>
    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
    <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
    <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
    <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell className="text-right space-x-2">
       <Skeleton className="inline-block h-8 w-8 rounded" />
       <Skeleton className="inline-block h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);

export default function QuestionsPage() {
  const { toast } = useToast();
  const { user, userProfile, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFolder, setFilterFolder] = useState<string | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);


  const canViewQuestions = hasPermission('manage_questions');
  const canCreateQuestions = hasPermission('create_questions');
  const canEditQuestions = hasPermission('edit_questions');
  const canDeleteQuestions = hasPermission('delete_questions');

  const { data: questions, isLoading, error } = useFirestoreQuery<Question>(
    ['questions'],
    { path: 'questions', listen: true, constraints: [orderBy('createdAt', 'desc')], enabled: canViewQuestions }
  );

  const deleteMutation = useDeleteDocument<Question>({
     collectionPath: 'questions',
     invalidateQueries: [['questions']],
     onSuccess: async (voidResponse, variables) => {
       toast({ title: "Question Deleted", description: "The question has been successfully deleted." });
       if (user && userProfile) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Deleted Question',
            entityType: 'Question',
            entityId: variables.id,
            details: { questionText: variables.deletedEntityTitle || 'N/A' }
        });
      }
     },
     onError: (error) => {
       toast({ title: "Deletion Failed", description: error.message || "Could not delete the question.", variant: "destructive" });
     }
   });

   const handleDeleteClick = (question: Question) => {
      if (!canDeleteQuestions) {
        toast({ title: "Permission Denied", description: "You do not have permission to delete questions.", variant: "destructive" });
        return;
      }
      setQuestionToDelete(question);
   }

   const confirmDeleteQuestion = () => {
     if (!canDeleteQuestions || !questionToDelete) return;
     deleteMutation.mutate({
        id: questionToDelete.id!,
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined,
        deletedEntityTitle: questionToDelete.text
     });
     setQuestionToDelete(null);
   };

    const folders = useMemo(() => {
        if (!questions) return [];
        const uniqueFolders = new Set(questions.map(q => q.folder).filter(Boolean));
        return Array.from(uniqueFolders).sort() as string[];
    }, [questions]);

   const displayedQuestions = useMemo(() => {
     if (!questions) return [];
     const lowerSearchTerm = searchTerm.toLowerCase();

     return questions.filter(q => {
        const matchesSearch = (
          (q.text && q.text.toLowerCase().includes(lowerSearchTerm)) ||
          (q.topic && q.topic.toLowerCase().includes(lowerSearchTerm)) ||
          (q.difficulty && q.difficulty.toLowerCase().includes(lowerSearchTerm)) ||
          (q.folder && q.folder.toLowerCase().includes(lowerSearchTerm)) ||
          (q.type && q.type.toLowerCase().includes(lowerSearchTerm))
        );
        const matchesFolder = !filterFolder || q.folder === filterFolder;
        return matchesSearch && matchesFolder;
     });
   }, [questions, searchTerm, filterFolder]);


  if (error && canViewQuestions) return <p className="text-destructive">Error loading questions: {error.message}</p>;
  if (!canViewQuestions && !isLoading) return <p className="text-destructive p-4">You do not have permission to view questions.</p>;

  return (
    <div className="space-y-6">
      <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
         className="flex flex-wrap justify-between items-center gap-4"
      >
        <h1 className="text-3xl font-bold">Manage Questions</h1>
         <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="ml-auto" disabled={isLoading || folders.length === 0}>
                    <Filter className="mr-2 h-4 w-4" /> {filterFolder ? `Folder: ${filterFolder}` : 'Filter Folder'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by Folder</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterFolder(null)}>
                    All Folders
                  </DropdownMenuItem>
                  {folders.map((folder) => (
                    <DropdownMenuItem key={folder} onClick={() => setFilterFolder(folder)}>
                      {folder}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

             <Button asChild disabled={!canCreateQuestions || isLoading}>
               <Link href="/admin/questions/new">
                 <PlusCircle className="mr-2 h-4 w-4" /> Add New Question
               </Link>
             </Button>
         </div>
      </motion.div>

       <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader>
            <CardTitle>Question Bank</CardTitle>
            <CardDescription>Browse, manage, and create all questions. Use the filter above to narrow results.</CardDescription>
              <div className="pt-2">
                 <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                    disabled={isLoading}
                 />
              </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Img</TableHead>
                  <TableHead>Question Text</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : displayedQuestions && displayedQuestions.length > 0 ? (
                  displayedQuestions.map((q) => (
                    <TableRow key={q.id}>
                       <TableCell>
                          {q.imageUrl ? (
                             <div className="relative h-10 w-10 rounded overflow-hidden border">
                                <Image src={q.imageUrl} alt="Q image" layout="fill" objectFit="cover" />
                             </div>
                          ) : (
                             <div className="flex items-center justify-center h-10 w-10 rounded border bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                             </div>
                          )}
                       </TableCell>
                       <TableCell className="font-medium max-w-sm">
                         <p className="line-clamp-3">{q.text}</p>
                       </TableCell>
                       <TableCell className="capitalize">{q.type.replace('-', ' ')}</TableCell>
                       <TableCell>
                           {q.folder ? (
                               <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                   <Folder className="h-3 w-3"/> {q.folder}
                               </span>
                           ) : (
                               <span className="text-xs text-muted-foreground italic">None</span>
                           )}
                       </TableCell>
                       <TableCell className="text-xs text-muted-foreground">{q.topic || <span className="italic">None</span>}</TableCell>
                       <TableCell>
                        <Badge variant={getDifficultyBadgeVariant(q.difficulty)} className="capitalize">
                          {q.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>{q.createdAt ? format(q.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" asChild title="Edit Question" disabled={!canEditQuestions || deleteMutation.isPending}>
                           <Link href={`/admin/questions/edit/${q.id}`}>
                            <Edit className="h-4 w-4" />
                           </Link>
                         </Button>
                        {/* Button now directly sets state to open the dialog */}
                           <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              title="Delete Question"
                              disabled={!canDeleteQuestions || (deleteMutation.isPending && deleteMutation.variables?.id === q.id)}
                              onClick={() => handleDeleteClick(q)}
                            >
                             {(deleteMutation.isPending && deleteMutation.variables?.id === q.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                           </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                     <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                       No questions found{searchTerm || filterFolder ? ' matching your criteria' : ''}. {canCreateQuestions && <Link href="/admin/questions/new" className="text-primary hover:underline">Create one?</Link>}
                     </TableCell>
                   </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
       </motion.div>
       <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question "{questionToDelete?.text.substring(0,50)}..." {questionToDelete?.imageUrl ? 'and its associated image' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuestionToDelete(null)} disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteQuestion}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !canDeleteQuestions}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

