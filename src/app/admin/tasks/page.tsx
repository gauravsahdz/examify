
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, Filter, CalendarDays, UserCircle } from "lucide-react";
import type { Task, UserProfile } from '@/lib/types';
import { TaskStatus } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useDeleteDocument } from '@/hooks/useFirestoreMutation';
import { format } from 'date-fns';
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
import { orderBy, where } from 'firebase/firestore';
import TaskFormDialog from '@/components/admin/TaskFormDialog';
import { useAuth } from '@/context/AuthContext';
import { CustomSelect, type CustomSelectOption } from '@/components/ui/custom-select';
import { Input } from '@/components/ui/input';
import { logActivity } from '@/lib/services/log.service'; // Import logActivity

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell className="text-right space-x-1">
      <Skeleton className="inline-block h-8 w-8 rounded" />
      <Skeleton className="inline-block h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);

const statusFilterOptions: CustomSelectOption[] = [
  { value: "all", label: "All Statuses" },
  ...Object.values(TaskStatus).map(status => ({ value: status, label: status }))
];

function getStatusBadgeVariant(status: TaskStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case TaskStatus.TODO: return "outline";
    case TaskStatus.IN_PROGRESS: return "secondary";
    case TaskStatus.DONE: return "default";
    case TaskStatus.ARCHIVED: return "outline";
    default: return "outline";
  }
}

export default function TasksPage() {
  const { toast } = useToast();
  const { user, userProfile, isAdmin } = useAuth(); // Get current admin user info, isAdmin
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const queryConstraints = useMemo(() => {
    const constraints = [orderBy('createdAt', 'desc')];
    if (filterStatus !== 'all') {
      constraints.unshift(where('status', '==', filterStatus));
    }
    return constraints;
  }, [filterStatus]);

  const { data: tasks, isLoading, error } = useFirestoreQuery<Task>(
    ['tasks', filterStatus],
    { path: 'tasks', listen: true, constraints: queryConstraints }
  );

  const { data: usersForDropdown } = useFirestoreQuery<UserProfile>(['users', 'forTaskAssign'], { path: 'users' });

  const deleteMutation = useDeleteDocument<Task>({
     collectionPath: 'tasks',
     invalidateQueries: [['tasks', filterStatus]],
     onSuccess: async (voidResponse, variables) => {
       toast({ title: "Task Deleted", description: "The task has been successfully deleted." });
       if (user && userProfile) {
         await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown Admin',
            action: 'Deleted Task',
            entityType: 'Task',
            entityId: variables.id,
            details: { taskTitle: variables.deletedEntityTitle || 'N/A' }
         });
       }
     },
     onError: (error) => {
       toast({ title: "Deletion Failed", description: error.message || "Could not delete the task.", variant: "destructive" });
     }
   });

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const handleDeleteClick = (task: Task) => {
    if (!isAdmin) {
      toast({ title: "Permission Denied", description: "You do not have permission to delete tasks.", variant: "destructive" });
      return;
    }
    setTaskToDelete(task);
  };

  const confirmDeleteTask = () => {
    if (!isAdmin) return;
    if (taskToDelete?.id) {
      deleteMutation.mutate({
        id: taskToDelete.id,
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined,
        deletedEntityTitle: taskToDelete.title
      });
    }
    setTaskToDelete(null);
  };

  const handleEditTask = (task: Task) => {
    if (!isAdmin) {
      toast({ title: "Permission Denied", description: "You do not have permission to edit tasks.", variant: "destructive" });
      return;
    }
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const handleAddNewTask = () => {
    if (!isAdmin) {
      toast({ title: "Permission Denied", description: "You do not have permission to add tasks.", variant: "destructive" });
      return;
    }
    setSelectedTask(null);
    setIsFormOpen(true);
  };

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(lowerSearchTerm) ||
      task.description?.toLowerCase().includes(lowerSearchTerm) ||
      task.assigneeName?.toLowerCase().includes(lowerSearchTerm)
    );
  }, [tasks, searchTerm]);

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Tasks</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
         className="flex flex-wrap justify-between items-center gap-4"
      >
        <h1 className="text-3xl font-bold">Task Management</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleAddNewTask} disabled={!isAdmin}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
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
            <CardTitle>Task List</CardTitle>
            <CardDescription>View, manage, and assign tasks.</CardDescription>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Input
                placeholder="Search tasks (title, description, assignee)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                disabled={isLoading}
              />
              <div className="w-full sm:w-[200px]">
                <CustomSelect
                  value={filterStatus}
                  onValueChange={(value) => setFilterStatus(value as TaskStatus | 'all')}
                  options={statusFilterOptions}
                  placeholder="Filter by status..."
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : filteredTasks && filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium max-w-sm">
                        <p className="truncate" title={task.title}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground truncate" title={task.description}>{task.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(task.status)} className="capitalize">
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {task.assigneeName || <span className="italic text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {task.dueDate ? format(task.dueDate.toDate(), 'PP') : <span className="italic text-muted-foreground">No due date</span>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Edit Task" onClick={() => handleEditTask(task)} disabled={!isAdmin}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Delete Task"
                            onClick={() => handleDeleteClick(task)}
                            disabled={deleteMutation.isPending && deleteMutation.variables?.id === task.id || !isAdmin}
                          >
                            {deleteMutation.isPending && deleteMutation.variables?.id === task.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                       No tasks found{searchTerm || filterStatus !== 'all' ? ' matching your criteria' : ''}.
                     </TableCell>
                   </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <TaskFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(null);
        }}
        taskData={selectedTask}
        allUsers={usersForDropdown || []}
        currentUserId={user?.uid || ''}
      />

      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the task "{taskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)} disabled={deleteMutation.isPending || !isAdmin}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive hover:bg-destructive/90" disabled={deleteMutation.isPending || !isAdmin}>
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
