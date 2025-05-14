
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, User as UserIcon, PanelLeft, Bell, Menu, Home, ChevronLeft, LayoutDashboard } from 'lucide-react'; // Added LayoutDashboard
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import NotificationBell from '@/components/notifications/NotificationBell';
import { usePathname } from 'next/navigation';

interface AppHeaderProps {
    title?: string; // Optional title for the header
    showBackButton?: boolean;
    backButtonHref?: string;
}

export function AppHeader({ title, showBackButton = false, backButtonHref }: AppHeaderProps) {
  const { user, userProfile, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/auth/signin');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  const userInitial = userProfile?.displayName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';
  const homeHref = isAdmin ? '/admin/dashboard' : '/';


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
       {showBackButton ? (
         <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => backButtonHref ? router.push(backButtonHref) : router.back()}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
         </Button>
       ) : (
         <Link href={homeHref} className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Home className="h-5 w-5 text-primary" />
            <span className="sr-only">Home</span>
         </Link>
       )}

      {title && <h1 className="text-xl font-semibold ml-2 flex-1 truncate">{title}</h1>}

      <div className="flex w-full items-center justify-end gap-2 md:gap-4 ml-auto">
         <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="overflow-hidden rounded-full h-9 w-9 border-2 border-border hover:border-primary transition-colors">
              {loading ? (
                  <Skeleton className="h-full w-full rounded-full" />
               ) : (
                  <Avatar className="h-full w-full">
                   {/* <AvatarImage src={userProfile?.photoURL ?? undefined} alt={userProfile?.displayName ?? 'User'} /> */}
                   <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
               )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userProfile?.displayName ?? 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{userProfile?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href="/profile">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/admin/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>App Settings</span>
                    </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
