
'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UserProfileForm } from '@/components/profile/UserProfileForm';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { SubscriptionDetailsCard } from '@/components/profile/SubscriptionDetailsCard';
import { Loader2, ShieldCheck, UserCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion } from 'framer-motion';
import { AppHeader } from '@/components/AppHeader'; // Using a generic AppHeader

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { // Check Firebase auth user first
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You must be logged in to view your profile.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userProfile) { // If auth user exists, but no Firestore profile
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive">
          <AlertTitle>Profile Not Found</AlertTitle>
          <AlertDescription>
            Your user profile data could not be loaded. This might be due to an incomplete registration
            or a temporary issue. Please try logging out and back in, or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <AppHeader title="My Profile" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          {/* User Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {userProfile.roleIds?.includes('admin_role_id_placeholder') || userProfile.permissions?.includes('super_admin') ? <ShieldCheck className="h-6 w-6 text-primary" /> : <UserCircle className="h-6 w-6 text-primary" />}
                User Information
              </CardTitle>
              <CardDescription>View and manage your personal details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <UserProfileForm userProfile={userProfile} />
            </CardContent>
          </Card>

          <Separator />

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Change your account password.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>

          <Separator />

          {/* Subscription Details Card */}
          <SubscriptionDetailsCard userProfile={userProfile} />

        </motion.div>
      </main>
    </>
  );
}
