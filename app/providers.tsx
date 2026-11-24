'use client';

import { Toaster } from 'react-hot-toast';
import { SiteContentProvider } from '@/context/site-content-context';
import { SessionBootstrap } from '@/components/auth/session-bootstrap';
import { MotionConfig } from 'framer-motion';

export function Providers({ children, initialContent }: { children: React.ReactNode; initialContent: Record<string, unknown> | null }) {
  return (
    <MotionConfig reducedMotion="user"><SiteContentProvider initialContent={initialContent}>
      <SessionBootstrap />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--foreground)',
            color: 'var(--background)',
            borderRadius: '8px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </SiteContentProvider></MotionConfig>
  );
}
