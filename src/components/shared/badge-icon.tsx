'use client';

import {
  UserPlus,
  Ticket,
  Medal,
  MessageSquare,
  Users,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/core/utils/utils';

/**
 * Badges store their icon as a name string. These were previously rendered
 * directly inside a text node, so the literal word ("zap", "ticket") was
 * printed at display size instead of a glyph.
 */
const ICONS: Record<string, LucideIcon> = {
  'user-plus': UserPlus,
  ticket: Ticket,
  medal: Medal,
  'message-square': MessageSquare,
  users: Users,
  // Names still present on badges seeded before the rename.
  zap: UserPlus,
  trophy: Medal,
  'shield-check': Users,
};

export function BadgeIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Award;
  return <Icon className={cn('shrink-0', className)} aria-hidden />;
}
