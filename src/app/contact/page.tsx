
'use client';

import React from 'react';
import { LandingHeader } from '@/components/LandingHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Mail, Send, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

type FormData = z.infer<typeof formSchema>;

export default function ContactPage() {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            subject: "",
            message: "",
        },
    });

    // Placeholder submit handler
    const onSubmit = async (values: FormData) => {
        setIsSubmitting(true);
        console.log("Contact Form Data:", values);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        toast({
            title: "Message Sent!",
            description: "Thank you for contacting us. We'll get back to you shortly.",
        });
        form.reset(); // Clear the form
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
            <LandingHeader />
            <main className="flex-grow container mx-auto px-4 py-16 sm:py-24 flex items-center justify-center">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                    className="w-full max-w-2xl"
                >
                    <Card className="shadow-xl border-primary/10">
                        <CardHeader className="text-center">
                             <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
                            <CardTitle className="text-3xl md:text-4xl font-bold">Contact Us</CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Have questions or need assistance? Fill out the form below.
                            </CardDescription>
                        </CardHeader>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Your Name" {...field} disabled={isSubmitting}/>
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
                                                         <Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting}/>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="subject"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Subject</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Subject of your message" {...field} disabled={isSubmitting}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="message"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Message</FormLabel>
                                                <FormControl>
                                                     <Textarea
                                                        placeholder="Enter your message here..."
                                                        rows={5}
                                                        {...field}
                                                        disabled={isSubmitting}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button type="submit" disabled={isSubmitting}>
                                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                         {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    </Card>
                </motion.div>
            </main>
             <footer className="w-full py-6 text-center text-xs text-muted-foreground border-t border-border/40 mt-auto">
               © {new Date().getFullYear()} Examify. All rights reserved.
             </footer>
        </div>
    );
}
