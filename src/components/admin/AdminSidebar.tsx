
'use client';

import React from 'react';
import Link from 'next/link';
import { useFirestoreDocument } from '@/hooks/useFirestoreQuery';
import { usePathname } from 'next/navigation';
import { SIDEBAR_NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Home, PanelLeftClose, PanelRightClose, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { AppSettings } from '@/lib/types';
import type { PermissionId } from '@/lib/constants'; // Import PermissionId

interface AdminSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  isMobileMenuOpen: boolean;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

const SIDEBAR_WIDTH_EXPANDED = "16rem";
const SIDEBAR_WIDTH_COLLAPSED = "4.5rem";

const sidebarVariants = {
  expanded: { width: SIDEBAR_WIDTH_EXPANDED },
  collapsed: { width: SIDEBAR_WIDTH_COLLAPSED },
};

const textVariants = {
  expanded: { opacity: 1, width: 'auto', transition: { delay: 0.15, duration: 0.2 } },
  collapsed: { opacity: 0, width: 0, transition: { duration: 0.1 } },
};


export function AdminSidebar({
  isOpen,
  isMobile,
  isMobileMenuOpen,
  toggleSidebar,
  setMobileMenuOpen
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, userProfile, hasPermission } = useAuth(); // Added hasPermission

   const { data: appSettings } = useFirestoreDocument<AppSettings>(
    ['appSettings', 'main'],
    { path: 'appSettings/main', listen: true }
  );

  const userInitial = userProfile?.displayName?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?';

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground overflow-y-auto scrollbar-hide">

       <div className={cn(
            "flex items-center border-b border-sidebar-border transition-all duration-300 ease-in-out",
            isOpen ? "px-4 h-16" : "px-0 justify-center h-16"
       )}>
         <Link href="/" className="flex items-center gap-2 overflow-hidden">
           <Zap className="w-6 h-6 text-primary flex-shrink-0" />
            <AnimatePresence>
             {isOpen && appSettings?.appName && (
               <motion.span
                 variants={textVariants}
                 initial="collapsed"
                 animate="expanded"
                 exit="collapsed"
                 className="font-bold text-lg whitespace-nowrap"
               >
                 {appSettings.appName}
               </motion.span>
             )}
            </AnimatePresence>
         </Link>
         {!isMobile && (
            <Button
               variant="ghost"
               size="icon"
               onClick={toggleSidebar}
               className={cn(
                   "ml-auto h-8 w-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
               )}
               aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
                 {isOpen ? <PanelLeftClose className="h-5 w-5"/> : <PanelRightClose className="h-5 w-5"/>}
             </Button>
          )}
       </div>

       <div className={cn(
         "flex items-center gap-3 border-b border-sidebar-border px-4 py-3 transition-all duration-300 ease-in-out",
         !isOpen && "px-0 justify-center py-3"
       )}>
         <Avatar className={cn("h-9 w-9 border border-sidebar-accent flex-shrink-0", !isOpen && "h-8 w-8")}>
           <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground/80 font-semibold text-sm">
             {userInitial}
           </AvatarFallback>
         </Avatar>
          <AnimatePresence>
            {isOpen && (
             <motion.div
               variants={textVariants}
               initial="collapsed"
               animate="expanded"
               exit="collapsed"
               className="overflow-hidden whitespace-nowrap"
              >
               <p className="text-sm font-medium leading-tight">{userProfile?.displayName ?? 'Admin User'}</p>
               <p className="text-xs text-sidebar-foreground/70 leading-tight mt-0.5">{userProfile?.email}</p>
             </motion.div>
            )}
         </AnimatePresence>
       </div>

       <nav className="flex-1 overflow-x-hidden py-3 px-2 space-y-1">
         <TooltipProvider delayDuration={100}>
           {SIDEBAR_NAV_ITEMS.filter(item => !item.permission || hasPermission(item.permission as PermissionId)).map((item) => { // Filter by permission
             const isActive = pathname.startsWith(item.href);
             return (
               <Tooltip key={item.href}>
                 <TooltipTrigger asChild>
                   <Link href={item.href} passHref legacyBehavior>
                     <Button
                       variant="ghost"
                       className={cn(
                         "w-full justify-start items-center gap-3 h-10 px-3 text-sm",
                         !isOpen && "justify-center px-0 w-auto mx-auto aspect-square h-11",
                         isActive ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
                                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                       )}
                       aria-current={isActive ? 'page' : undefined}
                     >
                       <item.icon className="h-5 w-5 flex-shrink-0" />
                       <AnimatePresence>
                          {isOpen && (
                           <motion.span
                              variants={textVariants}
                              initial="collapsed"
                              animate="expanded"
                              exit="collapsed"
                              className="overflow-hidden whitespace-nowrap flex-1 text-left"
                           >
                               {item.label}
                           </motion.span>
                         )}
                       </AnimatePresence>
                     </Button>
                   </Link>
                 </TooltipTrigger>
                 {!isOpen && (
                   <TooltipContent side="right" className="bg-sidebar-foreground text-sidebar-background text-xs px-2 py-1">
                     {item.label}
                   </TooltipContent>
                 )}
               </Tooltip>
             );
           })}
         </TooltipProvider>
       </nav>

       <div className="mt-auto border-t border-sidebar-border p-2">
         <TooltipProvider delayDuration={100}>
            <Tooltip>
                 <TooltipTrigger asChild>
                   <Link href="/" passHref legacyBehavior>
                     <Button
                       variant="ghost"
                       className={cn(
                         "w-full justify-start items-center gap-3 h-10 px-3 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                         !isOpen && "justify-center px-0 w-auto mx-auto aspect-square h-11",
                       )}
                     >
                       <Home className="h-5 w-5 flex-shrink-0" />
                       <AnimatePresence>
                          {isOpen && (
                           <motion.span
                              variants={textVariants}
                              initial="collapsed"
                              animate="expanded"
                              exit="collapsed"
                              className="overflow-hidden whitespace-nowrap flex-1 text-left"
                           >
                               Back to Home
                           </motion.span>
                         )}
                       </AnimatePresence>
                     </Button>
                   </Link>
                 </TooltipTrigger>
                 {!isOpen && (
                   <TooltipContent side="right" className="bg-sidebar-foreground text-sidebar-background text-xs px-2 py-1">
                     Back to Home
                   </TooltipContent>
                 )}
               </Tooltip>
         </TooltipProvider>
       </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 border-r border-sidebar-border">
            <SheetHeader className="sr-only">
                 <SheetTitle>Admin Menu</SheetTitle>
             </SheetHeader>
             <AdminSidebar
                isOpen={true}
                isMobile={true}
                isMobileMenuOpen={isMobileMenuOpen}
                toggleSidebar={() => {}}
                setMobileMenuOpen={setMobileMenuOpen}
             />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <motion.aside
      className="fixed top-0 left-0 z-40 h-screen hidden md:flex flex-col"
      variants={sidebarVariants}
      initial={false}
      animate={isOpen ? "expanded" : "collapsed"}
      transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
    >
       {sidebarContent}
    </motion.aside>
  );
}
