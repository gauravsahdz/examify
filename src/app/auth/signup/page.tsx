
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, query, where, collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { UserProfile, Role } from '@/lib/types';
import { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion } from 'framer-motion';
import { CANDIDATE_DEFAULT_ROLE_NAME, CANDIDATE_DEFAULT_PERMISSIONS } from '@/lib/constants';

const formSchema = z.object({
  displayName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormData = z.infer<typeof formSchema>;

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
    },
  });

  const getCandidateRoleId = async (): Promise<string | null> => {
    const rolesRef = collection(db, 'roles');
    const q = query(rolesRef, where('name', '==', CANDIDATE_DEFAULT_ROLE_NAME));

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      } else {
        // Candidate role not found, let's try to create it
        console.warn(`Role "${CANDIDATE_DEFAULT_ROLE_NAME}" not found. Attempting to create it with default permissions.`);
        try {
          const newRoleData: Omit<Role, 'id'> = { // Ensure Role type is imported and matches
            name: CANDIDATE_DEFAULT_ROLE_NAME,
            description: 'Default role for new users (candidates).',
            permissions: [...CANDIDATE_DEFAULT_PERMISSIONS], // Ensure this constant is imported and correct
            createdAt: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
          };
          const docRef = await addDoc(rolesRef, newRoleData);
          console.log(`Default role "${CANDIDATE_DEFAULT_ROLE_NAME}" created with ID: ${docRef.id}`);
          return docRef.id;
        } catch (createError) {
          console.error(`Failed to create default role "${CANDIDATE_DEFAULT_ROLE_NAME}":`, createError);
          return null; // Failed to create, return null
        }
      }
    } catch (error) {
      console.error(`Error fetching or creating candidate role ID for "${CANDIDATE_DEFAULT_ROLE_NAME}":`, error);
      return null;
    }
  };

  const onSubmit = async (values: FormData) => {
    setIsLoading(true);
    let userCredential;

    try {
      userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      try {
           await updateProfile(user, { displayName: values.displayName });
      } catch (profileError: any) {
           console.warn("Failed to update Auth profile:", profileError.message);
      }

      const candidateRoleId = await getCandidateRoleId();
      if (!candidateRoleId) {
        toast({
          title: "Sign Up Failed",
          description: `Default role "${CANDIDATE_DEFAULT_ROLE_NAME}" could not be configured. Please contact support.`,
          variant: "destructive",
        });
        // Optionally delete the auth user if profile setup fails critically
        // if (userCredential) await userCredential.user.delete();
        setIsLoading(false);
        return;
      }

      const userDocRef = doc(db, 'users', user.uid);
      const newUserProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: values.displayName,
        roleIds: [candidateRoleId], 
        createdAt: serverTimestamp() as Timestamp,
        subscriptionPlanId: SubscriptionPlan.FREE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      };
      await setDoc(userDocRef, newUserProfile);

      toast({
        title: "Sign Up Successful",
        description: "Your account has been created.",
      });
      router.push('/');

    } catch (error: any) {
      console.error("Sign up error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.code) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "This email address is already registered.";
                break;
            case 'auth/weak-password':
                errorMessage = "Password is too weak. Please choose a stronger password.";
                break;
            case 'auth/invalid-email':
                 errorMessage = "Please enter a valid email address.";
                 break;
            default:
                 errorMessage = `Authentication error: ${error.message}`;
                 break;
        }
      } else if (userCredential) {
         // This case might occur if Auth user creation succeeded but Firestore profile/role operations failed before this point.
         errorMessage = "Account created, but failed to save profile or assign role. Please contact support or try logging in.";
         console.error("Firestore profile/role operation failed after Auth user creation.");
      }

       toast({
        title: "Sign Up Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4"
      >
      <Card className="w-full shadow-xl border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Sign Up</CardTitle>
          <CardDescription>Create your Examify account</CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                      <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign Up
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                  Already have an account?{' '}
                <Button variant="link" asChild className="p-0 h-auto">
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </motion.div>
  );
}
