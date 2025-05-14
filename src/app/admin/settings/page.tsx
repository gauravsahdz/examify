
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralSettingsForm } from '@/components/admin/settings/GeneralSettingsForm';
import { DefaultTestSettingsForm } from '@/components/admin/settings/DefaultTestSettingsForm';
import { NotificationSettingsForm } from '@/components/admin/settings/NotificationSettingsForm';
import { useFirestoreDocument } from '@/hooks/useFirestoreQuery';
import type { AppSettings } from '@/lib/types';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { motion } from 'framer-motion';

const SETTINGS_DOC_ID = 'main'; // Singleton document for app settings

export default function SettingsPage() {
  const { data: appSettings, isLoading, error } = useFirestoreDocument<AppSettings>(
    ['appSettings', SETTINGS_DOC_ID],
    {
      path: `appSettings/${SETTINGS_DOC_ID}`,
      listen: true, // Listen for real-time updates to settings
    }
  );

  // State to hold potentially non-existent initial settings for forms
  const [initialSettings, setInitialSettings] = useState<Partial<AppSettings> | null>(null);

  useEffect(() => {
    if (!isLoading && !error) {
      setInitialSettings(appSettings || {}); // Use fetched settings or empty object if none exist
    }
  }, [appSettings, isLoading, error]);


  if (isLoading && !initialSettings) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-1 items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Settings</AlertTitle>
          <AlertDescription>
            Could not load application settings. Please try again later. <br />
            <code className="text-xs">{error.message}</code>
          </AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-3xl font-bold">Application Settings</h1>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="defaultTest">Default Test Config</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage basic application settings.</CardDescription>
            </CardHeader>
            <CardContent>
              {initialSettings !== null ? (
                <GeneralSettingsForm initialData={initialSettings} settingsDocId={SETTINGS_DOC_ID} />
              ) : (
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaultTest">
          <Card>
            <CardHeader>
              <CardTitle>Default Test Settings</CardTitle>
              <CardDescription>Configure default values for new tests.</CardDescription>
            </CardHeader>
            <CardContent>
              {initialSettings !== null ? (
                <DefaultTestSettingsForm initialData={initialSettings} settingsDocId={SETTINGS_DOC_ID} />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage admin email notification preferences.</CardDescription>
            </CardHeader>
            <CardContent>
             {initialSettings !== null ? (
                <NotificationSettingsForm initialData={initialSettings} settingsDocId={SETTINGS_DOC_ID} />
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
