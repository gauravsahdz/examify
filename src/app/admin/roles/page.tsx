
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, UserCog } from "lucide-react";
import type { Role } from '@/lib/types';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { useDeleteDocument } from '@/hooks/useFirestoreMutation';
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
  // AlertDialogTrigger, // No longer needed here directly
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { orderBy } from 'firebase/firestore';
import RoleFormDialog from '@/components/admin/RoleFormDialog';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/services/log.service';
import { ALL_PERMISSIONS, ADMIN_DEFAULT_ROLE_NAME, CANDIDATE_DEFAULT_ROLE_NAME } from '@/lib/constants';

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
    <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
    <TableCell><Skeleton className="h-4 w-1/4" /></TableCell>
    <TableCell className="text-right space-x-1">
      <Skeleton className="inline-block h-8 w-8 rounded" />
      <Skeleton className="inline-block h-8 w-8 rounded" />
    </TableCell>
  </TableRow>
);

export default function RolesPage() {
  const { toast } = useToast();
  const { user: currentUser, userProfile: currentUserProfile, hasPermission } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const canManageRoles = hasPermission('manage_roles');

  const { data: roles, isLoading, error } = useFirestoreQuery<Role>(
    ['roles'],
    { path: 'roles', listen: true, constraints: [orderBy('name', 'asc')] }
  );

  const deleteMutation = useDeleteDocument<Role>({
     collectionPath: 'roles',
     invalidateQueries: [['roles']],
     onSuccess: async (voidResponse, variables) => {
       toast({ title: "Role Deleted", description: "The role has been successfully deleted." });
       if (currentUser && currentUserProfile) {
         await logActivity({
            userId: currentUser.uid,
            userName: currentUserProfile.displayName || currentUser.email || 'Unknown Admin',
            action: 'Deleted Role',
            entityType: 'Role',
            entityId: variables.id,
            details: { roleName: variables.deletedEntityTitle || 'N/A' }
         });
       }
     },
     onError: (error) => {
       toast({ title: "Deletion Failed", description: error.message || "Could not delete the role.", variant: "destructive" });
     }
   });

  const handleDeleteClick = (role: Role) => {
    if (!canManageRoles) {
      toast({ title: "Permission Denied", description: "You do not have permission to delete roles.", variant: "destructive" });
      return;
    }
    if (role.name === ADMIN_DEFAULT_ROLE_NAME || role.name === CANDIDATE_DEFAULT_ROLE_NAME) {
        toast({ title: "Action Denied", description: `The "${role.name}" role is a default system role and cannot be deleted.`, variant: "destructive" });
        return;
    }
    setRoleToDelete(role);
  };

  const confirmDeleteRole = () => {
    if (!canManageRoles || !roleToDelete) return;
    deleteMutation.mutate({
        id: roleToDelete.id!,
        currentUserInfo: currentUser && currentUserProfile ? { userId: currentUser.uid, userName: currentUserProfile.displayName || currentUser.email! } : undefined,
        deletedEntityTitle: roleToDelete.name
    });
    setRoleToDelete(null);
  };

  const handleEditRole = (role: Role) => {
    if (!canManageRoles) {
      toast({ title: "Permission Denied", description: "You do not have permission to edit roles.", variant: "destructive" });
      return;
    }
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleAddNewRole = () => {
    if (!canManageRoles) {
      toast({ title: "Permission Denied", description: "You do not have permission to add new roles.", variant: "destructive" });
      return;
    }
    setSelectedRole(null);
    setIsFormOpen(true);
  };

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <AlertTriangle className="h-4 w-4 mr-2" />
      <p className="text-destructive">Error loading roles: {error.message}</p>
    </div>
  );
  if (!canManageRoles && !isLoading) return <p className="text-destructive p-4">You do not have permission to manage roles.</p>;


  return (
    <div className="space-y-6">
      <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.3 }}
         className="flex flex-wrap justify-between items-center gap-4"
      >
        <h1 className="text-3xl font-bold flex items-center gap-2"><UserCog className="h-7 w-7"/>Roles & Permissions</h1>
        <Button onClick={handleAddNewRole} disabled={!canManageRoles || isLoading}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Role
        </Button>
      </motion.div>

      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.1, duration: 0.5 }}
       >
        <Card>
          <CardHeader>
            <CardTitle>Defined Roles</CardTitle>
            <CardDescription>Manage user roles and their associated permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Permissions Count</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                   Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : roles && roles.length > 0 ? (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{role.description || <span className="italic">No description</span>}</TableCell>
                      <TableCell>{role.permissions.length}</TableCell>
                      <TableCell className="text-xs">{role.updatedAt ? format(role.updatedAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Edit Role" onClick={() => handleEditRole(role)} disabled={!canManageRoles || deleteMutation.isPending}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          title="Delete Role"
                          onClick={() => handleDeleteClick(role)}
                          disabled={!canManageRoles || deleteMutation.isPending && deleteMutation.variables?.id === role.id || role.name === ADMIN_DEFAULT_ROLE_NAME || role.name === CANDIDATE_DEFAULT_ROLE_NAME}
                        >
                          {deleteMutation.isPending && deleteMutation.variables?.id === role.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                       No roles found.
                     </TableCell>
                   </TableRow>
                 )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <RoleFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedRole(null);
        }}
        roleData={selectedRole}
        allPermissions={ALL_PERMISSIONS}
        currentUserId={currentUser?.uid || ''}
      />

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone and may affect users assigned to this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRoleToDelete(null)} disabled={deleteMutation.isPending || !canManageRoles}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole} className="bg-destructive hover:bg-destructive/90" disabled={deleteMutation.isPending || !canManageRoles}>
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
