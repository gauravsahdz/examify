
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import type { AppSettings } from '@/lib/types';
import { useSetDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Timer, Shuffle, Camera, Lock, Calculator, Code, MinusCircle, Undo2, Clock } from "lucide-react";
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { logActivity } from '@/lib/services/log.service'; // Import logActivity

const formSchema = z.object({
  defaultTestDurationMinutes: z.coerce.number().int().min(1).optional().default(30),
  defaultShowTimer: z.boolean().optional().default(true),
  defaultWebcamEnabled: z.boolean().optional().default(false),
  defaultShuffleQuestions: z.boolean().optional().default(false),
  defaultLockBrowser: z.boolean().optional().default(false),
  defaultNegativeMarking: z.boolean().optional().default(false),
  defaultCalculatorEnabled: z.boolean().optional().default(false),
  defaultAutoSave: z.boolean().optional().default(true),
  defaultAllowSwitchingQuestions: z.boolean().optional().default(true),
  defaultGracePeriodMinutes: z.coerce.number().int().min(0).nullable().optional().default(null),
  defaultPointsPerQuestion: z.coerce.number().min(0).optional().default(1),
  defaultAllowCodeExecution: z.boolean().optional().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface DefaultTestSettingsFormProps {
  initialData: Partial<AppSettings>;
  settingsDocId: string;
}

export function DefaultTestSettingsForm({ initialData, settingsDocId }: DefaultTestSettingsFormProps) {
  const { toast } = useToast();
  const { user, userProfile } = useAuth(); // Get current user

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultTestDurationMinutes: initialData.defaultTestDurationMinutes ?? 30,
      defaultShowTimer: initialData.defaultShowTimer ?? true,
      defaultWebcamEnabled: initialData.defaultWebcamEnabled ?? false,
      defaultShuffleQuestions: initialData.defaultShuffleQuestions ?? false,
      defaultLockBrowser: initialData.defaultLockBrowser ?? false,
      defaultNegativeMarking: initialData.defaultNegativeMarking ?? false,
      defaultCalculatorEnabled: initialData.defaultCalculatorEnabled ?? false,
      defaultAutoSave: initialData.defaultAutoSave ?? true,
      defaultAllowSwitchingQuestions: initialData.defaultAllowSwitchingQuestions ?? true,
      defaultGracePeriodMinutes: initialData.defaultGracePeriodMinutes ?? null,
      defaultPointsPerQuestion: initialData.defaultPointsPerQuestion ?? 1,
      defaultAllowCodeExecution: initialData.defaultAllowCodeExecution ?? false,
    },
  });

  const setSettingsMutation = useSetDocument<AppSettings>({
    collectionPath: 'appSettings',
    invalidateQueries: [['appSettings', settingsDocId]],
    onSuccess: async (voidResponse, variables) => {
      toast({ title: "Settings Saved", description: "Default test settings have been updated." });
      if (user && userProfile) {
        await logActivity({
            userId: user.uid,
            userName: userProfile.displayName || user.email || 'Unknown User',
            action: 'Updated Default Test Settings',
            entityType: 'Settings',
            entityId: settingsDocId,
            details: variables.data // Log all submitted default test settings
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
        ...values,
        defaultGracePeriodMinutes: values.defaultGracePeriodMinutes || null,
     };
    setSettingsMutation.mutate({
        id: settingsDocId,
        data: dataToSave as AppSettings,
        options: { merge: true },
        currentUserInfo: user && userProfile ? { userId: user.uid, userName: userProfile.displayName || user.email! } : undefined
    });
  };
  
  const isLoading = setSettingsMutation.isPending;

  const SwitchField = ({ name, label, description, icon: Icon }: { name: keyof FormData, label: string, description?: string, icon?: React.ElementType }) => (
    <FormField
      control={form.control}
      name={name}
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
                checked={field.value as boolean}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="defaultTestDurationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Duration (Minutes)</FormLabel>
                  <FormControl><Input type="number" min="1" {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="defaultPointsPerQuestion"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Default Points Per Question</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.5" {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SwitchField name="defaultShowTimer" label="Show Timer" icon={Timer} />
            <SwitchField name="defaultShuffleQuestions" label="Shuffle Questions" icon={Shuffle} />
            <SwitchField name="defaultWebcamEnabled" label="Enable Webcam" icon={Camera}/>
            <SwitchField name="defaultLockBrowser" label="Lock Browser" icon={Lock}/>
            <SwitchField name="defaultNegativeMarking" label="Negative Marking" icon={MinusCircle} />
            <SwitchField name="defaultCalculatorEnabled" label="Enable Calculator" icon={Calculator}/>
            <SwitchField name="defaultAutoSave" label="Auto-Save Progress" icon={Save}/>
            <SwitchField name="defaultAllowSwitchingQuestions" label="Allow Question Switching" icon={Undo2}/>
            <SwitchField name="defaultAllowCodeExecution" label="Allow Code Execution" icon={Code}/>
        </div>
         <FormField
            control={form.control}
            name="defaultGracePeriodMinutes"
            render={({ field }) => (
              <FormItem className="md:w-1/2">
                <FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground"/>Default Grace Period (Minutes)</FormLabel>
                <FormControl><Input type="number" min="0" placeholder="0 for none" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} disabled={isLoading}/></FormControl>
                <FormDescription className="text-xs">Extra time after timer ends (0 or blank for none).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Default Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}