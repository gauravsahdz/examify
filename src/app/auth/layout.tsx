
import type { ReactNode } from 'react';
import { AuthHeader } from '@/components/AuthHeader';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <AuthHeader />
      <main className="flex-grow flex items-center justify-center pt-16"> {/* Add padding-top to avoid overlap */}
        {children}
      </main>
    </div>
  );
}
