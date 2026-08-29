import PayoutsClient from '@/features/organizer/payouts-client';

export const metadata = {
  title: 'Revenue & Payouts | Eventra',
  description: 'Manage event ticketing revenue splits and bank payouts.',
};

export default function OrganizerPayoutsPage() {
  return <PayoutsClient />;
}
