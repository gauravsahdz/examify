
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import type { AppSettings } from '@/lib/types';
import { useSetDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Mail, UserPlus, CheckSquare, MessageSquare } from "lucide-react";
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { logActivity } from '@/lib/services/log.service'; // Import logActivity

const formSchema = z.object({
  adminEmailNotifications: z.object({
    newSubmission: z.boolean().optional().default(false),
    newFeedback: z.boolean().optional().default(false),
    newUserSignup: z.boolean().optional().default(false),
  }).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NotificationSettingsFormProps {
  initialData: Partial<AppSettings>;
  settingsDocId: string;
}

export function NotificationSettingsForm({ initialData, settingsDocId }: NotificationSettingsFormProps) {
  const { toast } = useToast();
  const { user, userProfile } = useAuth(); // Get current user

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      adminEmailNotifications: {
        newSubmission: initialData.adminEmailNotifications?.newSubmission ?? false,
        newFeedback: initialData.adminEmailNotifications?.newFeedback ?? false,
        newUserSignup: initialData.adminEmailNotifications?.newUserSignup ?? false,
      },
    },
  });

  const setSettingsMutation = useSetDocument<AppSettings>({
    collectionPath: 'appSettings',
    invalidateQueries: [['appSettings', settingsDocId]],
    onSuccess: async (voidResponse, variables) => {
      toast({ title: "Settings Saved", description: "Notification settings have been updated." });
      if (user && userProfile) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Updated Notification Settings',
            entityType: 'Settings',
            entityId: settingsDocId,
            details: { notifications: variables.data.adminEmailNotifications }
        });
      }
    },
    onError: (error) => {
      toast({ title: "Save Failed", description: error.message || "Could not save settings.", variant: "destructive" });
    }
  });

  const onSubmit = (values: FormData) => {
    const dataToSave: Partial<AppSettings> = {
        ...initialData,
        adminEmailNotifications: values.adminEmailNotifications,
    };
    setSettingsMutation.mutate({
        id: settingsDocId,
        data: dataToSave as AppSettings,
        options: { merge: true },
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined
    });
  };

  const isLoading = setSettingsMutation.isPending;

  const SwitchField = ({ name, label, description, icon: Icon }: { name: keyof NonNullable<FormData['adminEmailNotifications']>, label: string, description?: string, icon?: React.ElementType }) => (
    <FormField
      control={form.control}
      name={`adminEmailNotifications.${name}`}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
          <div className="space-y-0.5">
            <FormLabel className="text-sm flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                {label}
              </FormLabel>
              {description && <FormDescription className="text-xs">{description}</FormDescription>}
          </div>
          <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLoading}
              />
          </FormControl>
        </FormItem>
      )}
    />
  );


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-4">
             <h3 className="text-lg font-medium flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Admin Email Notifications</h3>
             <p className="text-sm text-muted-foreground">
                Configure which events should trigger email notifications to administrators.
                (Note: Actual email sending functionality is not implemented in this mock.)
             </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SwitchField name="newSubmission" label="New Test Submission" description="Receive an email when a candidate submits a test." icon={CheckSquare} />
            <SwitchField name="newFeedback" label="New User Feedback" description="Receive an email when a user provides feedback." icon={MessageSquare} />
            <SwitchField name="newUserSignup" label="New User Signup" description="Receive an email when a new user signs up." icon={UserPlus} />
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Notification Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
