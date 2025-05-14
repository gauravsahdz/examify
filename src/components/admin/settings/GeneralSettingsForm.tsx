
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch"; // Added import for Switch
import type { AppSettings } from '@/lib/types';
import { useSetDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useAuth } from '@/context/AuthContext'; // Import useAuth for user info
import { logActivity } from '@/lib/services/log.service'; // Import logActivity

const formSchema = z.object({
  appName: z.string().min(3, "App name must be at least 3 characters.").optional(),
  enableAuditLogs: z.boolean().optional().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface GeneralSettingsFormProps {
  initialData: Partial<AppSettings>;
  settingsDocId: string;
}

export function GeneralSettingsForm({ initialData, settingsDocId }: GeneralSettingsFormProps) {
  const { toast } = useToast();
  const { user, userProfile } = useAuth(); // Get current user info

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: initialData.appName || "Examify",
      enableAuditLogs: initialData.enableAuditLogs ?? true,
    },
  });

  const setSettingsMutation = useSetDocument<AppSettings>({
    collectionPath: 'appSettings',
    invalidateQueries: [['appSettings', settingsDocId]],
    onSuccess: async (voidResponse, variables) => {
      toast({ title: "Settings Saved", description: "General settings have been updated." });
      if (user && userProfile) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Updated General Settings',
            entityType: 'Settings',
            entityId: settingsDocId,
            details: { appName: variables.data.appName, enableAuditLogs: variables.data.enableAuditLogs }
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
        appName: values.appName,
        enableAuditLogs: values.enableAuditLogs,
    };
    setSettingsMutation.mutate({
        id: settingsDocId,
        data: dataToSave as AppSettings,
        options: { merge: true },
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="appName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., My Awesome App" {...field} value={field.value ?? ''} disabled={setSettingsMutation.isPending} />
              </FormControl>
              <FormDescription>This name will be displayed in various parts of the application.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="enableAuditLogs"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel>Enable Audit Logs</FormLabel>
                    <FormDescription>
                    Track important admin activities.
                    </FormDescription>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={setSettingsMutation.isPending}
                    />
                </FormControl>
                </FormItem>
            )}
       />


        <div className="flex justify-end">
          <Button type="submit" disabled={setSettingsMutation.isPending}>
            {setSettingsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
