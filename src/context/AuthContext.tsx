
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query as firestoreQuery, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import type { UserProfile, Role } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { ADMIN_DEFAULT_ROLE_NAME, CANDIDATE_DEFAULT_PERMISSIONS, PermissionId, ALL_PERMISSIONS } from '@/lib/constants';

interface AuthContextProps {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  permissions: PermissionId[] | null;
  hasPermission: (permissionId: PermissionId) => boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionId[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUserProfile(profileData);

            // Fetch roles and derive permissions
            if (profileData.roleIds && profileData.roleIds.length > 0) {
              const rolesCollectionRef = collection(db, 'roles');
              // Fetch only the roles assigned to the user
              const userRolesQuery = firestoreQuery(rolesCollectionRef, where('__name__', 'in', profileData.roleIds));
              const rolesSnapshot = await getDocs(userRolesQuery);
              const fetchedRoles = rolesSnapshot.docs.map(doc => doc.data() as Role);

              let effectivePermissions = new Set<PermissionId>();
              let adminRoleAssigned = false;

              fetchedRoles.forEach(role => {
                role.permissions.forEach(p => effectivePermissions.add(p as PermissionId));
                if (role.name === ADMIN_DEFAULT_ROLE_NAME) {
                  adminRoleAssigned = true;
                }
                // If a role has 'super_admin' permission, grant all permissions
                if (role.permissions.includes('super_admin')) {
                    ALL_PERMISSIONS.forEach(p => effectivePermissions.add(p.id));
                    adminRoleAssigned = true; // Super admin is also an admin
                }
              });
              
              setPermissions(Array.from(effectivePermissions));
              setIsAdmin(adminRoleAssigned);

            } else {
              // Default to candidate permissions if no roles assigned (should ideally not happen post-signup)
              setPermissions(CANDIDATE_DEFAULT_PERMISSIONS);
              setIsAdmin(false);
            }
          } else {
            console.warn("User profile not found in Firestore for UID:", firebaseUser.uid);
            setUserProfile(null);
            setPermissions([]);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error fetching user profile or roles:", error);
          setUserProfile(null);
          setPermissions([]);
          setIsAdmin(false);
        } finally {
           setLoading(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setPermissions(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = (permissionId: PermissionId): boolean => {
    if (loading || !permissions) return false;
    return permissions.includes(permissionId) || permissions.includes('super_admin');
  };

   if (loading) {
      return (
         <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
         </div>
      );
   }


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
