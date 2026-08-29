import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { NotificationWatcher } from '@/features/notifications/notification-watcher';
import { Inter, Instrument_Sans } from 'next/font/google';
import { baseMetadata, viewport as seoViewport, generateOrganizationSchema } from '@/core/services/seo';
import { NextIntlClientProvider } from 'next-intl';
import { getUserLocale } from '@/core/services/locale-service';
import { getMessages } from 'next-intl/server';
import { ClerkProvider } from '@clerk/nextjs';

const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Display face — headings and large numerals only. Body/UI stays on Inter.
const fontDisplay = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

// Export SEO metadata
export const metadata: Metadata = {
  ...baseMetadata,
  title: {
    default: 'Eventra — Modern Event Management Platform',
    template: '%s | Eventra',
  },
  description: 'Intelligent Event Management Platform for universities and organizations. Create, manage, and discover events with powerful tools.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();
  const messages = await getMessages();
  const organizationSchema = generateOrganizationSchema();
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error('CRITICAL: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing from environment variables.');
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang={locale} suppressHydrationWarning className={`${fontInter.variable} ${fontDisplay.variable}`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
        </head>
        <body className="font-sans antialiased bg-background text-foreground">
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Providers>
              {children}
              <NotificationWatcher />
              <Toaster />
            </Providers>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
