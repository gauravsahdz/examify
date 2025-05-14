
'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Save } from "lucide-react";
import { format } from 'date-fns'; // Removed parseISO as it's not used
import { cn } from "@/lib/utils";
import type { Task, UserProfile } from '@/lib/types';
import { TaskStatus } from '@/lib/types';
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/services/log.service';

const formSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus),
  assigneeUid: z.string().nullable().optional(),
  dueDate: z.date().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskData?: Task | null;
  allUsers: UserProfile[];
  currentUserId: string;
}

const statusOptions: CustomSelectOption[] = Object.values(TaskStatus).map(status => ({
  value: status,
  label: status,
}));

export default function TaskFormDialog({ isOpen, onClose, taskData, allUsers, currentUserId }: TaskFormDialogProps) {
  const { toast } = useToast();
  const { userProfile: adminUserProfile } = useAuth();
  const isEditing = !!taskData;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: TaskStatus.TODO,
      assigneeUid: null,
      dueDate: null,
    },
  });

  useEffect(() => {
    if (taskData) {
      form.reset({
        title: taskData.title,
        description: taskData.description || "",
        status: taskData.status,
        assigneeUid: taskData.assigneeUid || null,
        dueDate: taskData.dueDate ? taskData.dueDate.toDate() : null,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        status: TaskStatus.TODO,
        assigneeUid: null,
        dueDate: null,
      });
    }
  }, [taskData, form, isOpen]);

  const addMutation = useAddDocument<Task>({
    collectionPath: 'tasks',
    invalidateQueries: [['tasks']],
    onSuccess: async (docRef, variables) => {
      toast({ title: "Task Created", description: "New task added successfully." });
      if (adminUserProfile) {
        await logActivity({
            userId: currentUserId,
            userName: adminUserProfile.displayName || adminUserProfile.email || 'Unknown Admin',
            action: 'Created Task',
            entityType: 'Task',
            entityId: docRef.id,
            details: { title: variables.title, status: variables.status, assigneeName: variables.assigneeName || 'Unassigned' }
        });
      }
      onClose();
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Could not create task.", variant: "destructive" });
    }
  });

  const updateMutation = useUpdateDocument<Task>({
    collectionPath: 'tasks',
    invalidateQueries: [['tasks']],
    onSuccess: async (voidResponse, variables) => {
      toast({ title: "Task Updated", description: "Task details saved successfully." });
      if (adminUserProfile && taskData) {
        await logActivity({
            userId: currentUserId,
            userName: adminUserProfile.displayName || adminUserProfile.email || 'Unknown Admin',
            action: 'Updated Task',
            entityType: 'Task',
            entityId: taskData.id,
            details: { title: variables.data.title, status: variables.data.status, assigneeName: variables.data.assigneeName || 'Unassigned', changes: variables.data }
        });
      }
      onClose();
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message || "Could not update task.", variant: "destructive" });
    }
  });

  const assigneeOptions: CustomSelectOption[] = [
    { value: "", label: "Unassigned" },
    ...allUsers.map(user => ({ value: user.uid, label: user.displayName || user.email || 'Unnamed User' }))
  ];


  const onSubmit = async (values: FormData) => {
    const selectedAssignee = allUsers.find(u => u.uid === values.assigneeUid);

    const dataToSubmit: Partial<Task> = {
      title: values.title,
      description: values.description || null,
      status: values.status,
      assigneeUid: values.assigneeUid || null,
      assigneeName: selectedAssignee?.displayName || selectedAssignee?.email || null,
      dueDate: values.dueDate ? Timestamp.fromDate(values.dueDate) : null,
      creatorId: currentUserId,
    };

    if (isEditing && taskData?.id) {
      updateMutation.mutate({
        id: taskData.id,
        data: dataToSubmit,
        currentUserInfo: adminUserProfile ? { userId: currentUserId, userName: adminUserProfile.displayName || adminUserProfile.email! } : undefined
    });
    } else {
      addMutation.mutate(dataToSubmit as Omit<Task, 'id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const isLoading = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Add New Task'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details of the task.' : 'Fill in the details for the new task.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Prepare Q1 report" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add more details about the task..." {...field} rows={3} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <CustomSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        options={statusOptions}
                        placeholder="Select status"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assigneeUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee (Optional)</FormLabel>
                    <FormControl>
                      <CustomSelect
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val === "" ? null : val)}
                        options={assigneeOptions}
                        placeholder="Select assignee"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={(date) => field.onChange(date ?? null)}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0,0,0,0)) || isLoading
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                     Select a due date for this task.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
