
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, User as UserIcon, PanelLeft, Bell, Menu, Home } from 'lucide-react'; // Added Home
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
import NotificationBell from '@/components/notifications/NotificationBell'; // Import NotificationBell
import { usePathname } from 'next/navigation'; // Import usePathname

// Accept toggleMobileMenu prop
interface DashboardHeaderProps {
    toggleMobileMenu: () => void;
}

export function DashboardHeader({ toggleMobileMenu }: DashboardHeaderProps) {
  const { user, userProfile, loading, isAdmin } = useAuth(); // Added isAdmin
  const router = useRouter();
  const pathname = usePathname(); // Get current path
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

  // Determine if on an admin page to show Home link conditionally
  const onAdminPage = pathname.startsWith('/admin');


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
       {/* Sidebar Toggle for Mobile (already present from previous step) */}
        <Button
            size="icon"
            variant="outline"
            className="sm:hidden h-9 w-9" // Show only on mobile
            onClick={toggleMobileMenu}
         >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
        </Button>

        {/* Optional: Show a "Back to Home" or "Dashboard" link if not on admin root */}
        {onAdminPage && (
            <Link href="/" className="hidden items-center gap-2 text-lg font-semibold md:text-base sm:flex">
                <Home className="h-5 w-5 text-primary" />
                <span className="sr-only">Examify Home</span>
            </Link>
        )}


       {/* Header Content (Search, Notifications, User Menu) */}
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
            {isAdmin && ( // Show App Settings only to Admins
                <DropdownMenuItem asChild>
                    <Link href="/admin/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>App Settings</span>
                    </Link>
                </DropdownMenuItem>
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
