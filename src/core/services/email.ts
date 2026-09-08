import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload) {
  if (!resend) {
    console.warn('Resend API key is missing. Email dispatch skipped.');
    return { error: 'Email service not configured', success: false };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Eventra <notifications@eventra.com>',
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { error, success: false };
    }

    return { data, success: true };
  } catch (error) {
    console.error('Email service error:', error);
    return { error: 'Internal Server Error', success: false };
  }
}

/**
 * Escape a value before it is interpolated into an email body.
 *
 * Every template below builds raw HTML, and several of the values come from
 * users (event titles, display names, organiser announcements), so they have to
 * be escaped or an announcement can inject markup into the recipient's inbox.
 */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape a URL for use in an href, refusing anything that is not http(s).
 */
function escUrl(value: string | undefined): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
  } catch {
    return '';
  }
  return esc(value);
}

/**
 * Subject lines are a header, not HTML: entities would show up literally, so
 * only strip the newlines that would let a value inject extra headers.
 */
function plain(value: unknown): string {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

export function constructConfirmationEmail(userName: string, eventTitle: string, ticketNumber: string, entryCode?: string) {
  return {
    subject: `Registration Confirmed: ${plain(eventTitle)}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #06b6d4; text-align: center;">Registration Confirmed!</h1>
        <p>Hello ${esc(userName || 'Attendee')},</p>
        <p>Your registration for <strong>${esc(eventTitle)}</strong> has been successfully confirmed.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #06b6d4;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Ticket Number</p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 2px;">${esc(ticketNumber)}</p>
        </div>
        ${entryCode ? `
        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3b82f6; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Your 6-Digit Entry Code</p>
          <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 8px; font-family: monospace;">${esc(entryCode)}</p>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">Use this code at the check-in desk for quick entry</p>
        </div>
        ` : ''}
        <p>You can view and download your QR code ticket in the Eventra app under "My Tickets".</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eventra.com'}/tickets" style="background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View My Tickets</a>
        </div>
        <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center;">The Eventra Team</p>
      </div>
    `,
  };
}

export function constructCertificateEmail(userName: string, eventTitle: string) {
  return {
    subject: `Congratulations! Your certificate for ${plain(eventTitle)} is ready`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: #06b6d4; text-align: center;">Certificate Ready!</h1>
        <p>Hello ${esc(userName || 'Attendee')},</p>
        <p>Congratulations on completing <strong>${esc(eventTitle)}</strong>! Your official certificate of participation is now available for download.</p>
        <p>You can access it from your profile under the "Certificates" tab.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eventra.com'}/profile" style="background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Certificate</a>
        </div>
        <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center;">Well done from the Eventra Team!</p>
      </div>
    `,
  };
}

export function constructAnnouncementEmail(userName: string, eventTitle: string, content: string, type: string) {
  return {
    subject: `Important Update: ${plain(eventTitle)}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h1 style="color: ${type === 'urgent' ? '#ef4444' : '#06b6d4'}; text-align: center;">Event Announcement</h1>
        <p>Hello ${esc(userName || 'Attendee')},</p>
        <p>The organizer of <strong>${esc(eventTitle)}</strong> has posted an update:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${type === 'urgent' ? '#ef4444' : '#06b6d4'};">
          <p style="margin: 0; font-style: italic;">"${esc(content)}"</p>
        </div>
        <p>Stay tuned for more updates on the Eventra platform.</p>
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eventra.com'}/events" style="background: ${type === 'urgent' ? '#ef4444' : '#06b6d4'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Eventra</a>
        </div>
        <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center;">Sent via Eventra Notifications</p>
      </div>
    `,
  };
}

export function constructFeedbackEmail(userName: string, eventTitle: string, feedbackUrl: string) {
  return {
    subject: `We'd love your feedback on ${plain(eventTitle)}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">How was ${esc(eventTitle)}?</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello ${esc(userName || 'Attendee')},</p>
          <p>We hope you enjoyed <strong>${esc(eventTitle)}</strong>! Your feedback helps us improve future events.</p>
          <p>It only takes <strong>less than 3 minutes</strong> to share your thoughts.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${escUrl(feedbackUrl)}" style="background: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Share Your Feedback</a>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">Your feedback is anonymous unless you choose to share your name.</p>
        </div>
        <div style="padding: 15px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">The Eventra Team</p>
        </div>
      </div>
    `,
  };
}

export function constructThankYouEmail(userName: string, eventTitle: string, highlights?: string[], certificateUrl?: string, galleryUrl?: string) {
  const highlightsHtml = highlights && highlights.length > 0
    ? `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #22c55e;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #166534;">Event Highlights:</p>
        ${highlights.map(h => `<p style="margin: 4px 0; color: #166534;">• ${esc(h)}</p>`).join('')}
      </div>`
    : '';

  const buttonsHtml = `
    <div style="text-align: center; margin: 25px 0; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
      ${certificateUrl ? `<a href="${escUrl(certificateUrl)}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Download Certificate</a>` : ''}
      ${galleryUrl ? `<a href="${escUrl(galleryUrl)}" style="background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Gallery</a>` : ''}
    </div>
  `;

  return {
    subject: `Thank you for attending ${plain(eventTitle)}!`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #22c55e, #06b6d4); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Thank You!</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello ${esc(userName || 'Attendee')},</p>
          <p>Thank you for being a part of <strong>${esc(eventTitle)}</strong>! We hope you had a great experience.</p>
          ${highlightsHtml}
          ${buttonsHtml}
          <p>We'd love to see you at our next event. Stay tuned for more exciting opportunities!</p>
        </div>
        <div style="padding: 15px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">The Eventra Team</p>
        </div>
      </div>
    `,
  };
}

export function constructTicketConfirmationEmail(
  userName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  eventLocation: string,
  tickets: Array<{ ticketNumber: string; entryCode: string }>
) {
  const ticketsHtml = tickets.map(t => `
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 10px 0; text-align: center;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Ticket</p>
      <p style="margin: 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #1f2937;">${esc(t.ticketNumber)}</p>
      <div style="margin: 15px 0; padding: 12px; background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 8px;">
        <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Entry Code</p>
        <p style="margin: 0; font-family: monospace; font-size: 28px; font-weight: bold; color: #1d4ed8; letter-spacing: 6px;">${esc(t.entryCode)}</p>
      </div>
    </div>
  `).join('');

  return {
    subject: `Your tickets for ${plain(eventTitle)} are confirmed!`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <p style="color: white; margin: 0 0 5px 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Tickets Confirmed</p>
          <h1 style="color: white; margin: 0;">${esc(eventTitle)}</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello ${esc(userName || 'Attendee')},</p>
          <p>Your registration is confirmed! Here are your tickets:</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span style="color: #6b7280;">Date:</span>
              <span style="font-weight: bold;">${esc(eventDate)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span style="color: #6b7280;">Time:</span>
              <span style="font-weight: bold;">${esc(eventTime)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span style="color: #6b7280;">Location:</span>
              <span style="font-weight: bold;">${esc(eventLocation)}</span>
            </div>
          </div>

          ${ticketsHtml}

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-weight: bold; color: #92400e;">Important:</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #92400e;">Show your 6-digit entry code at the check-in desk for quick entry. You can also use the QR code in the app.</p>
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://eventra.com'}/tickets" style="background: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">View My Tickets</a>
          </div>
        </div>
        <div style="padding: 15px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">The Eventra Team</p>
        </div>
      </div>
    `,
  };
}
