import { db } from './index';
import { badges } from './schema';
import { sql, eq } from 'drizzle-orm';

export async function seedStandardBadges() {
  console.log('Seeding standard badges...');
  
  const standardBadges = [
    {
      name: 'Welcome Aboard',
      description: 'For creating your account.',
      icon: 'user-plus',
      category: 'onboarding',
      criteria: { type: 'account_created' }
    },
    {
      name: 'First Event',
      description: 'For registering for your first event.',
      icon: 'ticket',
      category: 'event',
      criteria: { type: 'registration_count', count: 1 }
    },
    {
      name: 'Regular',
      description: 'For attending five events.',
      icon: 'medal',
      category: 'event',
      criteria: { type: 'attendance_count', count: 5 }
    },
    {
      name: 'First Post',
      description: 'For your first community post.',
      icon: 'message-square',
      category: 'community',
      criteria: { type: 'post_count', count: 1 }
    },
    {
      name: 'Full House',
      description: 'For hosting an event with fifty or more attendees.',
      icon: 'users',
      category: 'organizer',
      criteria: { type: 'host_attendance', count: 50 }
    }
  ];

  try {
    for (const badge of standardBadges) {
      // badges.name carries no unique constraint, so onConflictDoNothing never
      // fired and repeat runs inserted duplicates. Match on the criteria type,
      // which survives a rename, and update in place so user_badges rows keep
      // pointing at the same badge.
      const existing = await db.query.badges.findFirst({
        where: sql`${badges.criteria}->>'type' = ${badge.criteria.type}`,
      });

      if (existing) {
        await db.update(badges).set({
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
        }).where(eq(badges.id, existing.id));
      } else {
        await db.insert(badges).values(badge);
      }
    }
    console.log('Standard badges seeded successfully.');
  } catch (error) {
    console.error('Error seeding badges:', error);
  }
}
