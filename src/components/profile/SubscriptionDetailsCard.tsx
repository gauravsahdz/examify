
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/types';
import { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';
import { CreditCard, Zap } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface SubscriptionDetailsCardProps {
  userProfile: UserProfile;
}

function getPlanBadgeVariant(plan?: SubscriptionPlan): "default" | "secondary" | "outline" | "destructive" {
  switch (plan) {
    case SubscriptionPlan.PRO: return "default";
    case SubscriptionPlan.ENTERPRISE: return "secondary";
    case SubscriptionPlan.FREE: return "outline";
    default: return "outline";
  }
}

function getStatusBadgeVariant(status?: SubscriptionStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case SubscriptionStatus.ACTIVE: return "default";
    case SubscriptionStatus.TRIALING: return "secondary";
    case SubscriptionStatus.CANCELED: return "destructive";
    case SubscriptionStatus.PAST_DUE: return "destructive";
    case SubscriptionStatus.INACTIVE: return "outline";
    default: return "outline";
  }
}


export function SubscriptionDetailsCard({ userProfile }: SubscriptionDetailsCardProps) {
  const plan = userProfile.subscriptionPlanId || SubscriptionPlan.FREE;
  const status = userProfile.subscriptionStatus || SubscriptionStatus.INACTIVE;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Subscription Details
        </CardTitle>
        <CardDescription>Manage your current subscription plan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
          <span className="text-sm font-medium text-muted-foreground">Current Plan:</span>
          <Badge variant={getPlanBadgeVariant(plan)} className="capitalize text-base px-3 py-1">
            {plan}
          </Badge>
        </div>
        <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
          <span className="text-sm font-medium text-muted-foreground">Status:</span>
          <Badge variant={getStatusBadgeVariant(status)} className="capitalize text-base px-3 py-1">
            {status.replace('_', ' ')}
          </Badge>
        </div>
        {userProfile.subscriptionEndDate && (
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <span className="text-sm font-medium text-muted-foreground">Ends On:</span>
            <span className="text-sm font-semibold">{format(userProfile.subscriptionEndDate.toDate(), 'PPP')}</span>
          </div>
        )}
        {/* Add more details like billing cycle, next payment date if available */}
      </CardContent>
      <CardFooter className="border-t pt-4">
        {plan === SubscriptionPlan.FREE ? (
          <Button asChild className="w-full">
            <Link href="/pricing">
              <Zap className="mr-2 h-4 w-4" /> Upgrade to Pro
            </Link>
          </Button>
        ) : (
          <Button variant="outline" asChild className="w-full">
            <Link href="/pricing">
                Manage Subscription
            </Link>
          </Button>
        )}
        {/* Add cancel subscription button if applicable */}
      </CardFooter>
    </Card>
  );
}
