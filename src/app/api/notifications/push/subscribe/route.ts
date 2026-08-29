import { NextResponse } from 'next/server';
import { registerPushSubscription, unregisterPushSubscription } from '@/core/services/push-notifications';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    await registerPushSubscription(userId, subscription);
    return NextResponse.json({ success: true, message: 'Web push subscription registered' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await unregisterPushSubscription(userId);
    return NextResponse.json({ success: true, message: 'Push subscription removed' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to unsubscribe' }, { status: 500 });
  }
}
