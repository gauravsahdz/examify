
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // Import getDoc
import { auth, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext'; // Import useAuth to check existing session
import type { UserProfile } from '@/lib/types';

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type FormData = z.infer<typeof formSchema>;

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user: existingUser, loading: authLoading } = useAuth(); // Get existing user state

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
      if (!authLoading && existingUser) {
          // Fetch profile to determine role for redirection
           const fetchProfileAndRedirect = async () => {
               const userDocRef = doc(db, 'users', existingUser.uid);
                try {
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const profile = userDocSnap.data() as UserProfile;
                        if (profile.role === 'Admin') {
                            router.push('/admin/dashboard');
                        } else {
                            router.push('/'); // Redirect Candidates to home
                        }
                    } else {
                         router.push('/'); // Fallback redirect if profile not found
                    }
                } catch (error) {
                    console.error("Error fetching profile for redirect:", error);
                     router.push('/'); // Fallback on error
                }
            };
            fetchProfileAndRedirect();
      }
  }, [existingUser, authLoading, router]);


  const onSubmit = async (values: FormData) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

       // After successful sign-in, fetch user profile to determine role
       const userDocRef = doc(db, 'users', user.uid);
       const userDocSnap = await getDoc(userDocRef);

      toast({
        title: "Sign In Successful",
        description: "Welcome back!",
      });

       if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          if (profile.role === 'Admin') {
             router.push('/admin/dashboard'); // Redirect Admins to dashboard
          } else {
             router.push('/'); // Redirect Candidates to home page
          }
       } else {
         console.warn("User profile not found after sign in for UID:", user.uid);
         router.push('/'); // Default redirect if profile not found
       }

    } catch (error: any) {
      console.error("Sign in error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      }
      toast({
        title: "Sign In Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

   // Render loading or null if already logged in and redirecting
    if (authLoading || (!authLoading && existingUser)) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

  return (
    // Remove the outer container div, rely on AuthLayout for centering
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md px-4" // Add padding if needed for spacing
    >
      <Card className="w-full shadow-xl border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Sign In</CardTitle>
          <CardDescription>Access your Examify account</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-4">
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
                Sign In
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{' '}
                <Button variant="link" asChild className="p-0 h-auto">
                  <Link href="/auth/signup">Sign Up</Link>
                  </Button>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </motion.div>
  );
}
