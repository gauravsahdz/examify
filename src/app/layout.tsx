
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/context/AuthContext'; // Import AuthProvider
import { QueryProvider } from '@/context/QueryProvider'; // Import QueryProvider

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Examify - Modern Testing Platform',
  description: 'Create, manage, and take tests online with AI-powered features.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-sans antialiased', inter.variable)}>
        <QueryProvider> {/* Add React Query Provider */}
          <AuthProvider> {/* Wrap with AuthProvider */}
            {/* Header removed from here, will be added in specific layouts */}
            {children}
            <Toaster />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
