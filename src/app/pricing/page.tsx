
'use client';

import React from 'react';
import { LandingHeader } from '@/components/LandingHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // Import useAuth hook

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

// Update PricingTier props to include planId for potential payment link
const PricingTier = ({ name, price, description, features, planId, popular = false }: { name: string, price: string, description: string, features: string[], planId: string, popular?: boolean }) => {
    const { user, loading } = useAuth(); // Get user status

    // Determine the correct href based on login status
    const getStartedHref = user ? `/payment?plan=${planId}` : '/auth/signup'; // Example payment link structure

    return (
        <motion.div variants={fadeIn} className="h-full">
            <Card className={`flex flex-col h-full shadow-md hover:shadow-lg transition-shadow ${popular ? 'border-primary border-2 relative' : 'border-border'}`}>
                {popular && (
                    <div className="absolute -top-4 right-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Star className="w-3 h-3" /> Most Popular
                    </div>
                )}
                <CardHeader className="pb-4">
                    <CardTitle className="text-2xl font-bold">{name}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <p className="text-4xl font-extrabold mb-4">{price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    <ul className="space-y-2">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Check className="w-4 h-4 text-accent flex-shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" variant={popular ? 'default' : 'outline'} asChild disabled={loading}>
                         {/* Use the dynamically determined href */}
                        <Link href={getStartedHref}>{loading ? 'Loading...' : (user ? 'Choose Plan' : 'Get Started')}</Link>
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

export default function PricingPage() {
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
            <LandingHeader />
            <main className="flex-grow container mx-auto px-4 py-16 sm:py-24">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Simple, Transparent Pricing</h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Choose the plan that fits your needs. No hidden fees, cancel anytime.
                    </p>
                </motion.div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                    initial="hidden"
                    animate="visible"
                    variants={{
                        visible: { transition: { staggerChildren: 0.1 } }
                    }}
                >
                    <PricingTier
                        name="Free"
                        price="$0"
                        description="Get started with the basics."
                        features={[
                            "Up to 3 active tests",
                            "Up to 10 questions per test",
                            "Basic analytics",
                            "Email support",
                            "50 submissions/month",
                        ]}
                        planId="free" // Add planId
                    />
                    <PricingTier
                        name="Pro"
                        price="$49"
                        description="For professionals and small teams."
                        features={[
                            "Unlimited tests & questions",
                            "AI Question Generation",
                            "AI Feedback Summary",
                            "Advanced analytics",
                            "Priority email support",
                            "1000 submissions/month",
                            "Webcam proctoring (Beta)",
                        ]}
                        planId="pro" // Add planId
                        popular={true}
                    />
                    <PricingTier
                        name="Enterprise"
                        price="Custom"
                        description="Tailored solutions for large organizations."
                        features={[
                            "Everything in Pro, plus:",
                            "Custom integrations (API)",
                            "Single Sign-On (SSO)",
                            "Dedicated account manager",
                            "Volume discounts",
                            "Custom features on request",
                        ]}
                        planId="enterprise" // Add planId
                    />
                </motion.div>

                {/* FAQ Section (Optional) */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                    className="mt-24 max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
                    <div className="text-left space-y-4">
                        <div>
                            <h3 className="font-semibold">Can I change my plan later?</h3>
                            <p className="text-muted-foreground text-sm">Yes, you can upgrade or downgrade your plan at any time from your account settings.</p>
                        </div>
                         <div>
                            <h3 className="font-semibold">Is there a free trial for paid plans?</h3>
                            <p className="text-muted-foreground text-sm">We currently offer a generous free plan. For Pro features, you can upgrade directly.</p>
                        </div>
                        <div>
                            <h3 className="font-semibold">What happens if I exceed my submission limit?</h3>
                            <p className="text-muted-foreground text-sm">We'll notify you when you approach your limit. You can upgrade your plan or wait until the next billing cycle.</p>
                        </div>
                        {/* Add more FAQs */}
                    </div>
                </motion.div>
            </main>
             <footer className="w-full py-6 text-center text-xs text-muted-foreground border-t border-border/40 mt-auto">
               © {new Date().getFullYear()} Examify. All rights reserved.
             </footer>
        </div>
    );
}
