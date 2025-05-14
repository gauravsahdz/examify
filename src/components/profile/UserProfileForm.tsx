
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label"; // Added import for Label
import type { UserProfile } from '@/lib/types';
import { useUpdateDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';


const formSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, { message: "Name cannot exceed 50 characters." }),
});

type FormData = z.infer<typeof formSchema>;

interface UserProfileFormProps {
  userProfile: UserProfile;
}

export function UserProfileForm({ userProfile }: UserProfileFormProps) {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: userProfile.displayName || "",
    },
  });

  const updateProfileMutation = useUpdateDocument<UserProfile>({
    collectionPath: 'users',
    invalidateQueries: [['user', userProfile.uid], ['users']], // Invalidate specific user query and all users list
    onSuccess: async (_, variables) => {
      // Also update Firebase Auth display name if it exists
      if (auth.currentUser && variables.data.displayName) {
        try {
          await updateFirebaseAuthProfile(auth.currentUser, { displayName: variables.data.displayName });
        } catch (authError) {
          console.error("Failed to update Firebase Auth display name:", authError);
          // Non-critical, Firestore update succeeded. Maybe log this or inform user subtly.
        }
      }
      toast({ title: "Profile Updated", description: "Your display name has been updated." });
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
    }
  });

  const onSubmit = (values: FormData) => {
    if (values.displayName === userProfile.displayName) {
        toast({ title: "No Changes", description: "Your display name is already set to this value.", variant: "default" });
        return;
    }
    updateProfileMutation.mutate({ id: userProfile.uid, data: { displayName: values.displayName } });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                    <Input placeholder="Your Name" {...field} disabled={updateProfileMutation.isPending} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full md:w-auto">
                {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Name
            </Button>
        </div>
        <div className="space-y-1">
            <Label>Email</Label>
            <Input value={userProfile.email || 'Not available'} readOnly disabled className="bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email address cannot be changed here.</p>
        </div>
         <div className="space-y-1">
            <Label>Role</Label>
            <Input value={userProfile.role} readOnly disabled className="bg-muted/50 capitalize" />
        </div>
      </form>
    </Form>
  );
}

