'use client';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  useEffect(() => {
    // A network-level fetch failure is worded differently by each engine:
    // Chromium says "Failed to fetch", WebKit "Load failed", Firefox
    // "NetworkError when attempting to fetch resource.". Matching only the
    // Chromium wording left this handler dead on the other two.
    const networkFailureMessages = [
      'Failed to fetch',
      'Load failed',
      'NetworkError when attempting to fetch resource',
    ];

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message;
      if (typeof message !== 'string') return;
      if (!networkFailureMessages.some((candidate) => message.includes(candidate))) return;

      toast({
        title: "System Synchronization Error",
        description: "Neural link to the database failed. Please verify your connection protocols.",
        variant: "destructive",
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('SW registered: ', registration);
            }
          },
          (err) => {
            console.warn('SW registration failed: ', err);
          }
        );
      });
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [toast]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

