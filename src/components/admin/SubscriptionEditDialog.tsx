
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Save } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import type { UserProfile } from '@/lib/types';
import { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';
import { useUpdateDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { logActivity } from '@/lib/services/log.service'; // Import logActivity

const formSchema = z.object({
  subscriptionPlanId: z.nativeEnum(SubscriptionPlan),
  subscriptionStatus: z.nativeEnum(SubscriptionStatus),
  subscriptionEndDate: z.date().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SubscriptionEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserProfile;
}

const planOptions: CustomSelectOption[] = Object.values(SubscriptionPlan).map(plan => ({
  value: plan,
  label: plan.charAt(0).toUpperCase() + plan.slice(1),
}));

const statusOptions: CustomSelectOption[] = Object.values(SubscriptionStatus).map(status => ({
  value: status,
  label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
}));

export default function SubscriptionEditDialog({ isOpen, onClose, userData }: SubscriptionEditDialogProps) {
  const { toast } = useToast();
  const { user: adminUser, userProfile: adminUserProfile } = useAuth(); // Get current admin user info

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subscriptionPlanId: userData.subscriptionPlanId || SubscriptionPlan.FREE,
      subscriptionStatus: userData.subscriptionStatus || SubscriptionStatus.INACTIVE,
      subscriptionEndDate: userData.subscriptionEndDate ? userData.subscriptionEndDate.toDate() : null,
    },
  });

  useEffect(() => {
    if (userData) {
      form.reset({
        subscriptionPlanId: userData.subscriptionPlanId || SubscriptionPlan.FREE,
        subscriptionStatus: userData.subscriptionStatus || SubscriptionStatus.INACTIVE,
        subscriptionEndDate: userData.subscriptionEndDate ? userData.subscriptionEndDate.toDate() : null,
      });
    }
  }, [userData, form, isOpen]);

  const updateMutation = useUpdateDocument<UserProfile>({
    collectionPath: 'users',
    invalidateQueries: [['users', 'allForSubscription'], ['user', userData.uid]],
    onSuccess: async (voidResponse, variables) => {
      toast({ title: "Subscription Updated", description: `${userData.displayName || userData.email}'s subscription details saved.` });
      if (adminUser && adminUserProfile) {
        await logActivity({
            userId: adminUser.uid,
            userName: adminUserProfile.displayName || adminUser.email || 'Unknown Admin',
            action: 'Updated User Subscription',
            entityType: 'User',
            entityId: userData.uid,
            details: {
                targetUserName: userData.displayName || userData.email,
                newPlan: variables.data.subscriptionPlanId,
                newStatus: variables.data.subscriptionStatus,
                newEndDate: variables.data.subscriptionEndDate ? (variables.data.subscriptionEndDate as Timestamp).toDate().toLocaleDateString() : 'N/A'
            }
        });
      }
      onClose();
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message || "Could not update subscription.", variant: "destructive" });
    }
  });

  const onSubmit = async (values: FormData) => {
    if (!userData.uid) return;

    const dataToUpdate: Partial<UserProfile> = {
      subscriptionPlanId: values.subscriptionPlanId,
      subscriptionStatus: values.subscriptionStatus,
      subscriptionEndDate: values.subscriptionEndDate ? Timestamp.fromDate(values.subscriptionEndDate) : null,
    };
    updateMutation.mutate({
        id: userData.uid,
        data: dataToUpdate,
        currentUserInfo: adminUser && adminUserProfile ? { userId: adminUser.uid, userName: adminUserProfile.displayName || adminUser.email! } : undefined
    });
  };

  const isLoading = updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Subscription for {userData.displayName || userData.email}</DialogTitle>
          <DialogDescription>
            Modify the user's subscription plan and status. (This is a mock interface, no actual payments are processed).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="subscriptionPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Plan</FormLabel>
                  <FormControl>
                    <CustomSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={planOptions}
                      placeholder="Select plan"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subscriptionStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Status</FormLabel>
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
              name="subscriptionEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Subscription End Date (Optional)</FormLabel>
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
                        initialFocus
                        disabled={isLoading}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Leave blank if the subscription does not have a fixed end date or is ongoing.</FormDescription>
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}