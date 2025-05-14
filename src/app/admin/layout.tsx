
'use client';
import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminLayoutProps {
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeInOut" } },
  exit: { opacity: 0, y: -15, transition: { duration: 0.3, ease: "easeInOut" } }
};

const SIDEBAR_WIDTH_EXPANDED = "16rem";
const SIDEBAR_WIDTH_COLLAPSED = "4.5rem";

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const { user, loading, isAdmin, permissions, hasPermission } = useAuth(); // Added permissions and hasPermission
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
    if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarState', !isSidebarOpen ? 'expanded' : 'collapsed');
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      const savedState = localStorage.getItem('sidebarState');
      setIsSidebarOpen(savedState === 'expanded');
    }
  }, [isMobile]);

  useEffect(() => {
      if (!isMobile && isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
      }
  }, [isMobile, isMobileMenuOpen]);


  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin');
      } else if (!isAdmin && !hasPermission('view_dashboard')) { // Check for basic dashboard view permission
        toast({ title: "Access Denied", description: "You do not have permission to access this area.", variant: "destructive" });
        router.push('/');
      }
    }
  }, [user, loading, isAdmin, router, toast, hasPermission]);


  if (loading || (!loading && (!user || (!isAdmin && !hasPermission('view_dashboard'))))) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const mainContentMargin = isMobile ? '0rem' : isSidebarOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED;

  return (
    <div className="flex min-h-screen bg-background">
       <AdminSidebar
          isOpen={isSidebarOpen}
          isMobile={!!isMobile}
          isMobileMenuOpen={isMobileMenuOpen}
          toggleSidebar={toggleSidebar}
          setMobileMenuOpen={setIsMobileMenuOpen}
       />

       <motion.div
          className="flex flex-1 flex-col overflow-hidden"
          initial={false}
          animate={{
             marginLeft: mainContentMargin,
          }}
          transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
       >
          <DashboardHeader toggleMobileMenu={toggleMobileMenu} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
             <AnimatePresence mode="wait">
                <motion.div
                   key={router.pathname}
                   variants={pageVariants}
                   initial="initial"
                   animate="animate"
                   exit="exit"
                 >
                  {children}
                </motion.div>
             </AnimatePresence>
          </main>
        </motion.div>
    </div>
  );
}
