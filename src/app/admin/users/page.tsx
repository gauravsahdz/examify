
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ShieldCheck, User, Loader2, AlertTriangle, CreditCard, UserCog } from "lucide-react";
import type { UserProfile, Role } from '@/lib/types';
import { SubscriptionPlan, SubscriptionStatus } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useDeleteDocument, useUpdateDocument } from '@/hooks/useFirestoreMutation';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // No longer needed here directly for the trigger button
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { orderBy } from 'firebase/firestore';
import SubscriptionEditDialog from '@/components/admin/SubscriptionEditDialog';
import { logActivity } from '@/lib/services/log.service';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';


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


const TableRowSkeleton = () => (
   <TableRow>
     <TableCell>
       <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
       </div>
     </TableCell>
     <TableCell><Skeleton className="h-4 w-32" /></TableCell>
     <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
     <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
     <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
     <TableCell className="text-right space-x-1">
       <Skeleton className="inline-block h-8 w-8 rounded" />
       <Skeleton className="inline-block h-8 w-8 rounded" />
       <Skeleton className="inline-block h-8 w-8 rounded" />
     </TableCell>
   </TableRow>
 );

interface UserRolesEditPopoverProps {
  user: UserProfile;
  allRoles: Role[];
  onSave: (userId: string, selectedRoleIds: string[]) => void;
  disabled?: boolean;
}

const UserRolesEditPopover: React.FC<UserRolesEditPopoverProps> = ({ user, allRoles, onSave, disabled }) => {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user.roleIds || []);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedRoleIds(user.roleIds || []);
  }, [user.roleIds, isOpen]);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = () => {
    onSave(user.uid, selectedRoleIds);
    setIsOpen(false);
  };

  const assignedRoleNames = useMemo(() => {
    return allRoles
      .filter(role => user.roleIds?.includes(role.id!))
      .map(role => role.name)
      .join(', ') || <span className="italic text-muted-foreground">No Roles</span>;
  }, [allRoles, user.roleIds]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-auto py-1 px-2" disabled={disabled}>
          <UserCog className="mr-1.5 h-3 w-3" />
          {assignedRoleNames}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Edit Roles for {user.displayName || user.email}</p>
        </div>
        <ScrollArea className="h-[200px] p-3">
          <div className="space-y-2">
            {allRoles.map(role => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`role-${user.uid}-${role.id}`}
                  checked={selectedRoleIds.includes(role.id!)}
                  onCheckedChange={() => handleRoleToggle(role.id!)}
                />
                <label htmlFor={`role-${user.uid}-${role.id}`} className="text-sm">
                  {role.name}
                </label>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};


export default function UsersPage() {
   const { toast } = useToast();
   const { user: currentUser, userProfile: currentUserProfile, hasPermission } = useAuth();
   const [userToEditSubscription, setUserToEditSubscription] = useState<UserProfile | null>(null);
   const [isSubFormOpen, setIsSubFormOpen] = useState(false);

   const canViewUsers = hasPermission('manage_users');
   const canEditUserRoles = hasPermission('assign_user_roles');
   const canDeleteUsers = hasPermission('delete_users');
   const canManageSubscriptions = hasPermission('manage_subscriptions');


   const { data: users, isLoading, error } = useFirestoreQuery<UserProfile>(
    ['users'],
    { path: 'users', listen: true, constraints: [orderBy('createdAt', 'desc')] }
  );

   const { data: allRoles, isLoading: isLoadingRoles } = useFirestoreQuery<Role>(
    ['roles'],
    { path: 'roles', listen: true }
  );


   const deleteMutation = useDeleteDocument<UserProfile>({
     collectionPath: 'users',
     invalidateQueries: [['users']],
     onSuccess: async (voidResponse, variables) => {
       toast({ title: "User Profile Deleted", description: "User profile removed from database (Auth record may still exist)." });
        if (currentUser && currentUserProfile) {
            await logActivity({
                userId: currentUser.uid,
                userName: currentUserProfile.displayName || currentUser.email || 'Unknown Admin',
                action: 'Deleted User Profile',
                entityType: 'User',
                entityId: variables.id,
                details: { deletedUserName: variables.deletedEntityTitle || 'N/A' }
            });
        }
     },
     onError: (error) => {
       toast({ title: "Deletion Failed", description: error.message || "Could not delete user profile.", variant: "destructive" });
     }
   });

   const updateUserRolesMutation = useUpdateDocument<UserProfile>({
        collectionPath: 'users',
        invalidateQueries: [['users'], ['user', currentUser?.uid]], // Invalidate self if roles changed
        onSuccess: async (voidResponse, variables) => {
            toast({ title: "Roles Updated", description: "User roles have been changed." });
            if (currentUser && currentUserProfile) {
                const targetUser = users?.find(u => u.uid === variables.id);
                const newRoleNames = allRoles?.filter(r => (variables.data.roleIds as string[])?.includes(r.id!)).map(r => r.name).join(', ');
                await logActivity({
                    userId: currentUser.uid,
                    userName: currentUserProfile.displayName || currentUser.email || 'Unknown Admin',
                    action: 'Updated User Roles',
                    entityType: 'User',
                    entityId: variables.id,
                    details: { targetUserName: targetUser?.displayName || targetUser?.email, newRoles: newRoleNames || 'None' }
                });
            }
        },
        onError: (error) => {
            toast({ title: "Role Update Failed", description: error.message || "Could not update roles.", variant: "destructive" });
        }
    });

    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

   const handleDeleteClick = (user: UserProfile) => {
      if (!canDeleteUsers) {
          toast({ title: "Permission Denied", description: "You do not have permission to delete users.", variant: "destructive" });
          return;
      }
      if (user.uid === currentUser?.uid) {
          toast({ title: "Action Denied", description: "You cannot delete your own profile.", variant: "destructive" });
          return;
      }
     setUserToDelete(user);
   };

   const confirmDeleteUser = () => {
        if (!canDeleteUsers || !userToDelete) return;
        deleteMutation.mutate({
            id: userToDelete.uid,
            currentUserInfo: currentUser && currentUserProfile ? { userId: currentUser.uid, userName: currentUserProfile.displayName || currentUser.email! } : undefined,
            deletedEntityTitle: userToDelete.displayName || userToDelete.email || 'N/A'
        });
        setUserToDelete(null);
   }


   const handleUserRolesSave = (userId: string, selectedRoleIds: string[]) => {
      if (!canEditUserRoles) {
          toast({ title: "Permission Denied", description: "You do not have permission to change roles.", variant: "destructive" });
          return;
      }
      if (userId === currentUser?.uid) {
          toast({ title: "Action Denied", description: "You cannot change your own roles via this interface.", variant: "destructive" });
          return;
      }
      updateUserRolesMutation.mutate({
        id: userId,
        data: { roleIds: selectedRoleIds },
        currentUserInfo: currentUser && currentUserProfile ? { userId: currentUser.uid, userName: currentUserProfile.displayName || currentUser.email! } : undefined
      });
   };

   const handleManageSubscription = (user: UserProfile) => {
     if (!canManageSubscriptions) {
         toast({ title: "Permission Denied", description: "You do not have permission to manage subscriptions.", variant: "destructive" });
         return;
     }
     setUserToEditSubscription(user);
     setIsSubFormOpen(true);
   };


  if (error) return <p className="text-destructive">Error loading users: {error.message}</p>;
  if (!canViewUsers && !isLoading) return <p className="text-destructive p-4">You do not have permission to view users.</p>;

  return (
    <div className="space-y-6">
      <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <h1 className="text-3xl font-bold">Manage Users</h1>
      </motion.div>

      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
            <CardDescription>Browse and manage all registered users, their roles, and subscriptions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Sub Status</TableHead>
                  <TableHead>Joined On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isLoadingRoles ? (
                    Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : users && users.length > 0 && allRoles ? (
                  users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{user.displayName?.charAt(0)?.toUpperCase() ?? user.email?.charAt(0)?.toUpperCase() ?? '?'}</AvatarFallback>
                          </Avatar>
                           {user.displayName || <span className="italic text-muted-foreground">No Name</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                         <UserRolesEditPopover
                            user={user}
                            allRoles={allRoles}
                            onSave={handleUserRolesSave}
                            disabled={!canEditUserRoles || updateUserRolesMutation.isPending || user.uid === currentUser?.uid}
                          />
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPlanBadgeVariant(user.subscriptionPlanId)} className="capitalize text-xs">
                          {user.subscriptionPlanId || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(user.subscriptionStatus)} className="capitalize text-xs">
                          {user.subscriptionStatus || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{user.createdAt ? format(user.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Manage Subscription" onClick={() => handleManageSubscription(user)} disabled={!canManageSubscriptions}>
                            <CreditCard className="h-4 w-4" />
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Delete User Profile"
                            onClick={() => handleDeleteClick(user)}
                            disabled={!canDeleteUsers || (deleteMutation.isPending && deleteMutation.variables?.id === user.uid) || user.uid === currentUser?.uid}
                        >
                            {(deleteMutation.isPending && deleteMutation.variables?.id === user.uid) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                        
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                     <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                       No users found.
                     </TableCell>
                   </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {userToEditSubscription && (
        <SubscriptionEditDialog
          isOpen={isSubFormOpen}
          onClose={() => {
            setIsSubFormOpen(false);
            setUserToEditSubscription(null);
          }}
          userData={userToEditSubscription}
        />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete {userToDelete?.displayName || userToDelete?.email}'s profile data from the database. It will NOT delete their authentication record. Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deleteMutation.isPending || !canDeleteUsers}
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Profile Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}

