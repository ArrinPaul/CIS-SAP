'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function LoginForm() {
  return (
    <div className="space-y-6">
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 bg-notion-surface text-black hover:bg-gray-200 rounded-full text-lg"
        disabled
      >
        Sign in with Google (Temporarily Disabled)
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Google OAuth is temporarily disabled during testing.
      </p>

      <div className="text-center text-sm text-muted-foreground">
        New to Eventra?{' '}
        <Link href="/register" className="text-primary font-semibold hover:text-primary-foreground">
          Create account
        </Link>
      </div>
    </div>
  );
}

