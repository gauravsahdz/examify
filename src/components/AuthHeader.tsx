
'use client';

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react'; // Or your logo component
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AuthHeader() {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        "absolute top-0 left-0 z-50 w-full border-b border-transparent bg-transparent" // Adjusted for overlay effect
      )}
    >
      <div className="flex h-16 items-center justify-center"> {/* Centered Logo */}
        {/* Logo and Site Name */}
        <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
          <Zap className="w-7 h-7" />
          <span className="font-bold text-xl">Examify</span>
        </Link>
      </div>
    </motion.header>
  );
}

