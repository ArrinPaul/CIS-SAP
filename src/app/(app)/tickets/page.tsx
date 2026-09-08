import MyTicketsClient from '@/features/ticketing/my-tickets-client';
import { Metadata } from 'next';
import { getUserRegistrations } from '@/app/actions/registrations';
import { refreshExpiredTicketStatuses } from '@/lib/ticket-status';

export const metadata: Metadata = {
  title: 'My Tickets | Eventra',
  description: 'View and manage your event tickets, check-in with QR codes.',
};

export default async function TicketsPage() {
  // Refresh statuses before showing to ensure 'expired' is accurate
  // Gracefully handle if DB is unavailable (e.g., during build)
  try {
    await refreshExpiredTicketStatuses();
  } catch (error) {
    console.warn('Could not refresh ticket statuses (DB may be unavailable):', error);
  }
  
  const tickets = await getUserRegistrations();
  
  return <MyTicketsClient initialTickets={tickets} />;
}

