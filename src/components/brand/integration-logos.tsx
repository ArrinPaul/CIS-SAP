'use client';

import React from 'react';
import { cn } from '@/core/utils/utils';

interface BrandLogoProps {
  className?: string;
}

export function NotionLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.047-.327L17.808 1.83c-.42-.326-.98-.7-2.054-.606L3.992 2.297c-.466.046-.56.326-.373.513l.84 1.398zm.887 3.545v13.673c0 .84.42 1.166 1.306 1.12l14.475-.84c.84-.047.933-.56.933-1.12V6.914c0-.56-.233-.84-.7-.793l-15.314.887c-.513.047-.7.28-.7.745zm13.493.746c.093.42.093.84-.28.887l-.98.14v10.593c-.56.327-1.12.513-1.633.513-.84 0-1.073-.28-1.727-1.073l-5.18-8.214v7.934l1.4.327c0 .42-.373.466-.7.466l-3.873.233c-.093-.28 0-.653.28-.7l1.12-.28V9.387l-1.4-.14c0-.42.28-.513.747-.56l3.92-.233 5.46 8.354V9.62l-1.307-.186c0-.42.327-.513.793-.56l3.36-.233z" />
    </svg>
  );
}

export function SlackLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A" />
      <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0" />
      <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D" />
      <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E" />
      <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
    </svg>
  );
}

export function DiscordLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

export function GoogleCalendarLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="4" fill="#FFFFFF" stroke="#4285F4" strokeWidth="1.5"/>
      <path d="M3 8.5H21" stroke="#4285F4" strokeWidth="1.5"/>
      <path d="M8 2V5" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 2V5" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8.5 13.5H10.5V17.5" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13.5 13.5H15.5C16.05 13.5 16.5 13.95 16.5 14.5C16.5 15.05 16.05 15.5 15.5 15.5H14.5H15.5C16.05 15.5 16.5 15.95 16.5 16.5C16.5 17.05 16.05 17.5 15.5 17.5H13.5" stroke="#FBBC05" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function FigmaLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <path d="M8 24C10.2091 24 12 22.2091 12 20V16H8C5.79086 16 4 17.7909 4 20C4 22.2091 5.79086 24 8 24Z" fill="#0ACF83" />
      <path d="M4 12C4 9.79086 5.79086 8 8 8H12V16H8C5.79086 16 4 14.2091 4 12Z" fill="#A259FF" />
      <path d="M4 4C4 1.79086 5.79086 0 8 0H12V8H8C5.79086 8 4 6.20914 4 4Z" fill="#F24E1E" />
      <path d="M12 0H16C18.2091 0 20 1.79086 20 4C20 6.20914 18.2091 8 16 8H12V0Z" fill="#FF7262" />
      <path d="M20 12C20 14.2091 18.2091 16 16 16C13.7909 16 12 14.2091 12 12C12 9.79086 13.7909 8 16 8C18.2091 8 20 9.79086 20 12Z" fill="#1ABCFE" />
    </svg>
  );
}

export function MiroLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#FFD02F"/>
      <path d="M18.666 4.333h-2.919l-2.074 4.542L11.599 4.333H8.68l-2.073 6.945h2.919l1.134-4.237 2.074 4.237h2.919l1.133-4.237 1.88 4.237h2.92l-2.92-6.945z" fill="#050038"/>
      <path d="M15.747 12.722l-2.074 4.543-2.074-4.543H8.68l2.919 6.945h2.919l2.074-4.238 1.134 4.238h2.919l-2.92-6.945h-1.979z" fill="#050038"/>
    </svg>
  );
}

export function GitHubLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

export function StripeLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#635BFF"/>
      <path d="M14.6 11.2c0-1.34-1.03-1.84-2.67-1.84-1.72 0-3.18.58-4.04 1.08l-.48-2.14c1.1-.52 2.82-.88 4.56-.88 3.17 0 5.19 1.49 5.19 4.22v6.64h-2.21v-1.36c-.84 1-2.11 1.6-3.6 1.6-2.24 0-3.83-1.39-3.83-3.44 0-2.49 2.12-3.5 5.13-3.5h1.95v-.38zm-1.97 5.43c1.27 0 1.97-.88 1.97-1.77v-.91h-1.77c-1.72 0-2.73.59-2.73 1.68 0 .93.79 1 2.53 1z" fill="#FFFFFF"/>
    </svg>
  );
}

export function ZoomLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#2D8CFF"/>
      <path d="M4.5 9C4.5 7.62 5.62 6.5 7 6.5h6.5c1.38 0 2.5 1.12 2.5 2.5v6c0 1.38-1.12 2.5-2.5 2.5H7c-1.38 0-2.5-1.12-2.5-2.5V9z" fill="#FFFFFF"/>
      <path d="M16 10.45l3.2-2.13a.75.75 0 0 1 1.17.62v6.12a.75.75 0 0 1-1.17.62l-3.2-2.13v-3.1z" fill="#FFFFFF"/>
    </svg>
  );
}

export function ConfluenceLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <path d="M3.714 17.472C2.793 16.14 2.89 14.33 3.96 13.1c2.193-2.52 6.44-5.263 11.238-7.393-.15 1.72-.94 3.42-2.338 4.74-2.128 2.008-5.32 4.41-9.146 7.025z" fill="#0052CC"/>
      <path d="M20.286 6.528c.921 1.332.824 3.142-.246 4.372-2.193 2.52-6.44 5.263-11.238 7.393.15-1.72.94-3.42 2.338-4.74 2.128-2.008 5.32-4.41 9.146-7.025z" fill="#2684FF"/>
    </svg>
  );
}

export function SupabaseLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <path d="M13.4 2.4L2.8 15.6c-.4.5-.1 1.3.6 1.3h8.3l-1.1 4.7c-.2.9.9 1.4 1.5.7l10.6-13.2c.4-.5.1-1.3-.6-1.3h-8.3l1.1-4.7c.2-.9-.9-1.4-1.5-.7z" fill="#3ECF8E" />
    </svg>
  );
}

export function ClerkLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#6C47FF" />
      <path d="M15.5 8.5C14.5 7.5 13 7 11.5 7 8.5 7 6.5 9.2 6.5 12s2 5 5 5c1.5 0 3-.5 4-1.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GeminiLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" fill="url(#gemini-grad)" />
      <defs>
        <linearGradient id="gemini-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1BA1E3" />
          <stop offset="0.5" stopColor="#5460E6" />
          <stop offset="1" stopColor="#9C52E0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ResendLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11zm2.5-.5a.5.5 0 0 0-.5.5v.7l7 4.55 7-4.55v-.7a.5.5 0 0 0-.5-.5h-13zm13.5 3.15l-6.46 4.2a1 1 0 0 1-1.08 0L5 9.15V17.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V9.15z" />
    </svg>
  );
}

export function TwilioLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#F22F46" />
      <circle cx="8.5" cy="8.5" r="2" fill="#FFFFFF" />
      <circle cx="15.5" cy="8.5" r="2" fill="#FFFFFF" />
      <circle cx="8.5" cy="15.5" r="2" fill="#FFFFFF" />
      <circle cx="15.5" cy="15.5" r="2" fill="#FFFFFF" />
    </svg>
  );
}

export function DodoLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#0052FF" />
      <path d="M8 7h4.5a5 5 0 0 1 5 5 5 5 0 0 1-5 5H8V7z" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function QrCodeLogo({ className }: BrandLogoProps) {
  return (
    <svg className={cn("w-5 h-5", className)} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M3 4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm2 1v3h3V5H5zm9-1a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4zm2 1v3h3V5h-3zM3 15a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5zm2 1v3h3v-3H5zm9-1a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2zm4 0a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-5zm-4 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2z"/>
    </svg>
  );
}
