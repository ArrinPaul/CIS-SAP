'use server';

import { db } from '@/lib/db';
import { tickets, events, users, notifications, certificateTemplates } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { certificatePersonalizedMessageFlow } from '@/lib/ai';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { sendEmail, constructCertificateEmail } from '@/core/services/email';

/**
 * Create or update a certificate template
 */
export async function upsertCertificateTemplate(data: {
  id?: string;
  eventId?: string;
  title: string;
  description?: string;
  layout: any;
  html?: string;
  isDefault?: boolean;
}) {
  const user = await validateRole(['organizer', 'admin']);

  if (data.eventId) {
    await validateEventOwnership(data.eventId);
  }

  if (data.id) {
    // Editing an existing template: authorise against the event it belongs to,
    // not just against whatever eventId the caller happened to send.
    const existing = await db.query.certificateTemplates.findFirst({
      where: eq(certificateTemplates.id, data.id),
    });
    if (!existing) throw new Error('Certificate template not found');
    if (existing.eventId) {
      await validateEventOwnership(existing.eventId);
    } else {
      await validateRole(['admin']);
    }
  } else if (!data.eventId) {
    // Global (default) templates are platform-wide.
    await validateRole(['admin']);
  }

  try {
    if (data.id) {
      const [updated] = await db
        .update(certificateTemplates)
        .set({
          title: data.title,
          description: data.description,
          layout: data.layout,
          html: data.html,
          isDefault: data.isDefault ?? false,
          updatedAt: new Date(),
        })
        .where(eq(certificateTemplates.id, data.id))
        .returning();
      
      revalidatePath('/organizer/certificates');
      return updated;
    } else {
      const [created] = await db
        .insert(certificateTemplates)
        .values({
          eventId: data.eventId,
          title: data.title,
          description: data.description,
          layout: data.layout,
          html: data.html,
          isDefault: data.isDefault ?? false,
        })
        .returning();
      
      revalidatePath('/organizer/certificates');
      return created;
    }
  } catch (error) {
    console.error('upsertCertificateTemplate Error:', error);
    throw new Error('Failed to save certificate template');
  }
}

/**
 * Get all templates for an event or global defaults
 */
export async function getCertificateTemplates(eventId?: string) {
  if (eventId) {
    await validateEventOwnership(eventId);
  } else {
    await validateRole(['organizer', 'admin']);
  }

  try {
    const conditions = [];
    if (eventId) {
      conditions.push(sql`${certificateTemplates.eventId} = ${eventId} OR ${certificateTemplates.isDefault} = true`);
    } else {
      conditions.push(eq(certificateTemplates.isDefault, true));
    }

    const result = await db
      .select()
      .from(certificateTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(certificateTemplates.createdAt));

    return result;
  } catch (error) {
    console.error('getCertificateTemplates Error:', error);
    return [];
  }
}

/**
 * Get all attendees for an event who have checked in
 */
export async function getCheckedInAttendees(eventId: string) {
  await validateEventOwnership(eventId);

  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        ticketNumber: tickets.ticketNumber,
        personalizedMessage: tickets.personalizedMessage,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .where(and(
        eq(tickets.eventId, eventId),
        eq(tickets.status, 'checked-in')
      ));

    return result.map(r => ({
      ...r,
      name: r.name || 'Attendee',
      status: 'pending' as const
    }));
  } catch (error) {
    console.error('getCheckedInAttendees Error:', error);
    return [];
  }
}

/**
 * Issue a certificate for a single ticket, generating a personalized AI message
 */
export async function issueCertificate(ticketId: string) {
  const ticketData = await db
    .select({
      ticket: tickets,
      event: events,
      user: users,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .innerJoin(users, eq(tickets.userId, users.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (ticketData.length === 0) throw new Error('Ticket not found');
  
  const { ticket, event, user } = ticketData[0];
  await validateEventOwnership(event.id);

  if (ticket.status !== 'checked-in') {
    throw new Error('Attendee must be checked in to receive a certificate');
  }

  try {
    // 1. Generate Personalized Message using AI
    const { personalizedMessage } = await certificatePersonalizedMessageFlow({
      userName: user.name || 'Attendee',
      eventTitle: event.title,
    });

    // 2. Update Ticket with the message and mark as "issued" (using a status or just the message presence)
    await db
      .update(tickets)
      .set({ 
        personalizedMessage,
        updatedAt: new Date()
      })
      .where(eq(tickets.id, ticketId));

    // 3. Notify user
    await db.insert(notifications).values({
      userId: user.id,
      title: 'Your Certificate is Ready!',
      message: `Congratulations! Your certificate for ${event.title} is now available for download.`,
      type: 'achievement',
      link: `/certificates`
    });

    revalidatePath(`/certificates`);
    return { success: true, message: personalizedMessage };
  } catch (error) {
    console.error('Certificate Issue Error:', error);
    throw new Error('Failed to generate certificate');
  }
}

/**
 * Send the certificate via email (Trigger)
 */
export async function sendCertificateEmail(ticketId: string) {
  const ticketData = await db
    .select({
      ticket: tickets,
      event: events,
      user: users,
    })
    .from(tickets)
    .innerJoin(events, eq(tickets.eventId, events.id))
    .innerJoin(users, eq(tickets.userId, users.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (ticketData.length === 0) throw new Error('Ticket not found');
  const { ticket, event, user } = ticketData[0];

  await validateEventOwnership(event.id);

  if (!ticket.personalizedMessage) {
    throw new Error('Certificate not yet issued. Issue it first to generate the message.');
  }

  try {
    // Send certificate email
    if (user.email) {
      const emailContent = constructCertificateEmail(user.name || 'Attendee', event.title);
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    }

    // Create notification
    await db.insert(notifications).values({
      userId: user.id,
      title: 'Certificate Email Sent',
      message: `Your certificate for ${event.title} has been sent to your email.`,
      type: 'success',
    });

    return { success: true };
  } catch (error) {
    console.error('Send Certificate Email Error:', error);
    throw new Error('Failed to send certificate email');
  }
}

/**
 * Bulk issue certificates for all checked-in attendees of an event
 */
export async function bulkIssueCertificates(eventId: string) {
  await validateEventOwnership(eventId);

  const checkedInTickets = await db
    .select()
    .from(tickets)
    .where(and(
      eq(tickets.eventId, eventId),
      eq(tickets.status, 'checked-in'),
      sql`${tickets.personalizedMessage} IS NULL`
    ));

  if (checkedInTickets.length === 0) {
    return { success: true, count: 0, message: 'No pending certificates for checked-in attendees' };
  }

  // Process in background or small batches to avoid timeouts
  let issuedCount = 0;
  for (const ticket of checkedInTickets) {
    try {
      await issueCertificate(ticket.id);
      issuedCount++;
    } catch (e) {
      console.error(`Failed to issue bulk certificate for ticket ${ticket.id}:`, e);
    }
  }

  revalidatePath('/organizer');
  return { success: true, count: issuedCount };
}

/**
 * Fetch all certificates for the current user
 */
export async function getUserCertificates() {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const result = await db
      .select({
        id: tickets.id,
        certificateNumber: tickets.ticketNumber,
        personalizedMessage: tickets.personalizedMessage,
        issueDate: tickets.updatedAt,
        event: {
          title: events.title,
          startDate: events.startDate,
        }
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(and(
        eq(tickets.userId, userId),
        sql`${tickets.personalizedMessage} IS NOT NULL`
      ))
      .orderBy(desc(tickets.updatedAt));

    return result;
  } catch (error) {
    console.error('getUserCertificates Error:', error);
    return [];
  }
}

/**
 * Verify a certificate by its number
 */
export async function verifyCertificate(certificateNumber: string) {
  try {
    const result = await db
      .select({
        certificateNumber: tickets.ticketNumber,
        issueDate: tickets.updatedAt,
        userName: users.name,
        eventTitle: events.title,
        personalizedMessage: tickets.personalizedMessage
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(and(
        eq(tickets.ticketNumber, certificateNumber.toUpperCase()),
        sql`${tickets.personalizedMessage} IS NOT NULL`
      ))
      .limit(1);

    if (result.length === 0) {
      return { valid: false };
    }

    return { 
      valid: true, 
      ...result[0] 
    };
  } catch (error) {
    console.error('verifyCertificate Error:', error);
    return { valid: false };
  }
}
