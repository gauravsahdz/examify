
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit, Loader2, AlertTriangle, Filter, UserCircle, ShieldCheck } from "lucide-react";
import type { UserProfile } from '@/lib/types';
import { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useUpdateDocument } from '@/hooks/useFirestoreMutation';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { orderBy } from 'firebase/firestore';
import SubscriptionEditDialog from '@/components/admin/SubscriptionEditDialog';
import { Input } from '@/components/ui/input'; // For search
import { useAuth } from '@/context/AuthContext';

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell className="text-right">
      <Skeleton className="inline-block h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);

function getPlanBadgeVariant(plan?: SubscriptionPlan): "default" | "secondary" | "outline" | "destructive" {
  switch (plan) {
    case SubscriptionPlan.PRO: return "default"; // Example: Pro is primary
    case SubscriptionPlan.ENTERPRISE: return "secondary"; // Example: Enterprise is secondary
    case SubscriptionPlan.FREE: return "outline";
    default: return "outline";
  }
}

function getStatusBadgeVariant(status?: SubscriptionStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case SubscriptionStatus.ACTIVE: return "default"; // Greenish
    case SubscriptionStatus.TRIALING: return "secondary"; // Blueish
    case SubscriptionStatus.CANCELED: return "destructive";
    case SubscriptionStatus.PAST_DUE: return "destructive";
    case SubscriptionStatus.INACTIVE: return "outline";
    default: return "outline";
  }
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading, error } = useFirestoreQuery<UserProfile>(
    ['users', 'allForSubscription'],
    { path: 'users', listen: true, constraints: [orderBy('createdAt', 'desc')] }
  );

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    return users.filter(user =>
      (user.displayName?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (user.email?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (user.subscriptionPlanId?.toLowerCase() || '').includes(lowerSearchTerm)
    );
  }, [users, searchTerm]);


  const handleEditSubscription = (user: UserProfile) => {
    if (!isAdmin) {
      toast({ title: "Permission Denied", description: "You do not have permission to edit subscriptions.", variant: "destructive" });
      return;
    }
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Users</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
         className="flex flex-wrap justify-between items-center gap-4"
      >
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        {/* Add New Subscription / User action might be elsewhere (e.g. User Page or Invites) */}
      </motion.div>

      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader>
            <CardTitle>User Subscriptions</CardTitle>
            <CardDescription>View and manage user subscription plans and statuses.</CardDescription>
            <Input
              placeholder="Search users (name, email, plan)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm mt-2"
              disabled={isLoading}
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscription End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            {user.role === 'Admin' ? <ShieldCheck className="h-4 w-4 text-primary" /> : <UserCircle className="h-4 w-4 text-muted-foreground" />}
                            {user.displayName || 'N/A'}
                        </div>
                        </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeVariant(user.subscriptionPlanId)} className="capitalize">
                          {user.subscriptionPlanId || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.subscriptionStatus)} className="capitalize">
                          {user.subscriptionStatus || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {user.subscriptionEndDate ? format(user.subscriptionEndDate.toDate(), 'PP') : <span className="italic text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Edit Subscription" onClick={() => handleEditSubscription(user)} disabled={!isAdmin}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                       No users found{searchTerm ? ' matching your search' : ''}.
                     </TableCell>
                   </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription Edit Dialog */}
      {selectedUser && (
        <SubscriptionEditDialog
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedUser(null);
          }}
          userData={selectedUser}
        />
      )}
    </div>
  );
}

