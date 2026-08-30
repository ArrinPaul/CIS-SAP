import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentWebhook } from '@/app/actions/payments';
import { refundOrderInternal } from '@/app/actions/orders';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { Webhook } from 'svix';

export async function POST(request: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
    const rawBody = await request.text();
    let body;

    if (!WEBHOOK_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('DODO_PAYMENTS_WEBHOOK_SECRET is not configured in production');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
      }
      logger.warn('DODO_PAYMENTS_WEBHOOK_SECRET is not configured, skipping signature verification in development');
      body = JSON.parse(rawBody);
    } else {
      const headersList = request.headers;
      const svix_id = headersList.get('webhook-id');
      const svix_timestamp = headersList.get('webhook-timestamp');
      const svix_signature = headersList.get('webhook-signature');

      if (!svix_id || !svix_timestamp || !svix_signature) {
        logger.error('Missing webhook signature headers');
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 });
      }

      const wh = new Webhook(WEBHOOK_SECRET);
      try {
        wh.verify(rawBody, {
          'svix-id': svix_id,
          'svix-timestamp': svix_timestamp,
          'svix-signature': svix_signature,
        });
      } catch (err) {
        logger.error('Invalid Dodo webhook signature', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }

      body = JSON.parse(rawBody);
    }

    const eventType = body.type || body.event_type;

    if (eventType === 'payment.completed' || eventType === 'checkout.session.completed') {
      const result = await handlePaymentWebhook(body.data || body);

      if (!result.success) {
        logger.error('Payment webhook processing failed', result);
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    if (eventType === 'payment.refunded' || eventType === 'refund.created') {
      const paymentId = body.data?.payment_id || body.data?.id || body.payment_id;

      if (paymentId) {
        const order = await db.query.orders.findFirst({
          where: eq(orders.paymentId, paymentId),
        });

        if (order) {
          const result = await refundOrderInternal(order.id);
          if (!result.success) {
            logger.error('Refund processing failed', result);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Payment webhook error', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

