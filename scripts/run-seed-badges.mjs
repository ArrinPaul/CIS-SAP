import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  prepare: false,
});

async function seedStandardBadges() {
  console.log('Seeding standard badges...');
  
  const standardBadges = [
    {
      name: 'Welcome Aboard',
      description: 'For creating your account.',
      icon: 'user-plus',
      category: 'onboarding',
      criteria: JSON.stringify({ type: 'account_created' })
    },
    {
      name: 'First Event',
      description: 'For registering for your first event.',
      icon: 'ticket',
      category: 'event',
      criteria: JSON.stringify({ type: 'registration_count', count: 1 })
    },
    {
      name: 'Regular',
      description: 'For attending five events.',
      icon: 'medal',
      category: 'event',
      criteria: JSON.stringify({ type: 'attendance_count', count: 5 })
    },
    {
      name: 'First Post',
      description: 'For your first community post.',
      icon: 'message-square',
      category: 'community',
      criteria: JSON.stringify({ type: 'post_count', count: 1 })
    },
    {
      name: 'Full House',
      description: 'For hosting an event with fifty or more attendees.',
      icon: 'users',
      category: 'organizer',
      criteria: JSON.stringify({ type: 'host_attendance', count: 50 })
    }
  ];

  try {
    for (const badge of standardBadges) {
      // Match on the criteria type rather than the name: names can change, and
      // matching on them would orphan every user_badges row pointing at the old
      // record. badges.name has no unique constraint, so this cannot be an
      // ON CONFLICT upsert.
      const criteriaType = JSON.parse(badge.criteria).type;
      const existing = await sql`
        select id, name from badges where criteria->>'type' = ${criteriaType}
      `;

      if (existing.length === 0) {
        await sql`
          insert into badges (name, description, icon, category, criteria)
          values (${badge.name}, ${badge.description}, ${badge.icon}, ${badge.category}, ${badge.criteria}::jsonb)
        `;
        console.log(`Badge "${badge.name}" created.`);
      } else {
        await sql`
          update badges
          set name = ${badge.name},
              description = ${badge.description},
              icon = ${badge.icon},
              category = ${badge.category}
          where id = ${existing[0].id}
        `;
        const was = existing[0].name;
        console.log(
          was === badge.name
            ? `Badge "${badge.name}" up to date.`
            : `Badge "${was}" renamed to "${badge.name}".`
        );
      }
    }
    console.log('Standard badges seeded successfully.');
  } catch (error) {
    console.error('Error seeding badges:', error);
  } finally {
    await sql.end();
  }
}

seedStandardBadges();
