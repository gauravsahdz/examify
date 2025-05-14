
import type { ReactNode } from 'react';
// Using DashboardHeader as it's more generic for logged-in user sections
// import { AppHeader } from '@/components/AppHeader'; // Or create a specific ProfileHeader

interface ProfileLayoutProps {
  children: ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* <AppHeader title="My Profile" />  // Header is now part of the page itself */}
      <div className="flex-1"> {/* Ensure children take up remaining space */}
        {children}
      </div>
    </div>
  );
}
