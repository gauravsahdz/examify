
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, ShieldQuestion } from "lucide-react";
import type { Role } from '@/lib/types';
import type { PermissionId } from '@/lib/constants';
import { useAddDocument, useUpdateDocument } from '@/hooks/useFirestoreMutation';
import { useToast } from "@/hooks/use-toast";
import { serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/services/log.service';
import { ADMIN_DEFAULT_ROLE_NAME, CANDIDATE_DEFAULT_ROLE_NAME } from '@/lib/constants';

const formSchema = z.object({
  name: z.string().min(2, { message: "Role name must be at least 2 characters." }),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(0, { message: "At least one permission must be selected for custom roles." }),
});

type FormData = z.infer<typeof formSchema>;

interface RoleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roleData?: Role | null;
  allPermissions: ReadonlyArray<{ id: PermissionId; label: string; group: string }>;
  currentUserId: string;
}

export default function RoleFormDialog({ isOpen, onClose, roleData, allPermissions, currentUserId }: RoleFormDialogProps) {
  const { toast } = useToast();
  const { userProfile: adminUserProfile } = useAuth();
  const isEditing = !!roleData;
  const isDefaultRole = roleData?.name === ADMIN_DEFAULT_ROLE_NAME || roleData?.name === CANDIDATE_DEFAULT_ROLE_NAME;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
    },
  });

  useEffect(() => {
    if (roleData) {
      form.reset({
        name: roleData.name,
        description: roleData.description || "",
        permissions: roleData.permissions as PermissionId[],
      });
    } else {
      form.reset({
        name: "",
        description: "",
        permissions: [],
      });
    }
  }, [roleData, form, isOpen]);

  const addMutation = useAddDocument<Omit<Role, 'id'>>({
    collectionPath: 'roles',
    invalidateQueries: [['roles']],
    onSuccess: async (docRef, variables) => {
      toast({ title: "Role Created", description: `Role "${variables.name}" added successfully.` });
      if (adminUserProfile) {
        await logActivity({
            userId: currentUserId,
            userName: adminUserProfile.displayName || adminUserProfile.email || 'Unknown Admin',
            action: 'Created Role',
            entityType: 'Role',
            entityId: docRef.id,
            details: { name: variables.name, permissionsCount: variables.permissions.length }
        });
      }
      onClose();
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Could not create role.", variant: "destructive" });
    }
  });

  const updateMutation = useUpdateDocument<Role>({
    collectionPath: 'roles',
    invalidateQueries: [['roles'], ['role', roleData?.id]],
    onSuccess: async (voidResponse, variables) => {
      toast({ title: "Role Updated", description: `Role "${variables.data.name}" saved successfully.` });
       if (adminUserProfile && roleData) {
        await logActivity({
            userId: currentUserId,
            userName: adminUserProfile.displayName || adminUserProfile.email || 'Unknown Admin',
            action: 'Updated Role',
            entityType: 'Role',
            entityId: roleData.id!,
            details: { name: variables.data.name, permissionsCount: (variables.data.permissions as string[])?.length, changes: variables.data }
        });
      }
      onClose();
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message || "Could not update role.", variant: "destructive" });
    }
  });

  const onSubmit = async (values: FormData) => {
    const dataToSubmit: Omit<Role, 'id' | 'createdAt' | 'updatedAt'> = {
      name: values.name,
      description: values.description || "",
      permissions: values.permissions,
    };

    if (isEditing && roleData?.id) {
      updateMutation.mutate({
        id: roleData.id,
        data: { ...dataToSubmit, updatedAt: serverTimestamp() } as Partial<Role>, // Cast to ensure type compatibility
        currentUserInfo: adminUserProfile ? { userId: currentUserId, userName: adminUserProfile.displayName || adminUserProfile.email! } : undefined
      });
    } else {
      addMutation.mutate({ ...dataToSubmit, createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Omit<Role, 'id'>);
    }
  };

  const isLoading = addMutation.isPending || updateMutation.isPending;

  const groupedPermissions = useMemo(() => {
    return allPermissions.reduce((acc, permission) => {
      const group = permission.group || 'General';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(permission);
      return acc;
    }, {} as Record<string, typeof allPermissions>);
  }, [allPermissions]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldQuestion className="h-6 w-6 text-primary"/>
            {isEditing ? `Edit Role: ${roleData?.name}` : 'Add New Role'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details and permissions for this role.' : 'Define a new role and assign permissions.'}
            {isDefaultRole && <span className="block text-sm text-destructive mt-1">Default system roles have restricted editing.</span>}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-hidden flex flex-col">
            {/* Added px-1 to this div for slight horizontal padding within the scroll area */}
            <ScrollArea className="flex-grow pr-2 -mr-2">
              <div className="space-y-4 py-4 px-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Editor, Grader" {...field} disabled={isLoading || isDefaultRole} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Briefly describe this role's purpose..." {...field} rows={2} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permissions</FormLabel>
                      <FormDescription>Select the permissions this role should have.</FormDescription>
                        <ScrollArea className="h-[300px] border rounded-md p-3 bg-muted/30">
                          {Object.entries(groupedPermissions).map(([groupName, permissionsInGroup]) => (
                            <div key={groupName} className="mb-4 last:mb-0">
                              <h4 className="text-sm font-semibold mb-2 text-primary">{groupName}</h4>
                              <div className="space-y-2">
                                {permissionsInGroup.map((permission) => (
                                  <FormItem key={permission.id} className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded hover:bg-background transition-colors">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(permission.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), permission.id])
                                            : field.onChange(
                                                (field.value || []).filter(
                                                  (value) => value !== permission.id
                                                )
                                              );
                                        }}
                                        disabled={isLoading || (isDefaultRole && permission.id === 'super_admin')}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal text-sm cursor-pointer flex-grow">
                                      {permission.label}
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </div>
                            </div>
                          ))}
                        </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t mt-auto"> {/* Added mt-auto to push footer down */}
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading || (isEditing && isDefaultRole && roleData?.name === ADMIN_DEFAULT_ROLE_NAME)}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? 'Save Changes' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
