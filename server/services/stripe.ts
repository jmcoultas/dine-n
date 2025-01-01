import Stripe from 'stripe';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export const stripeService = {
  async createCustomer(email: string, userId: number) {
    try {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId: userId.toString(),
        },
      });

      await db
        .update(users)
        .set({
          stripe_customer_id: customer.id,
        })
        .where(eq(users.id, userId));

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  },

  async createCheckoutSession(customerId: string) {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            recurring: {
              interval: 'month'
            },
            product_data: {
              name: 'Premium Subscription',
              description: 'Monthly subscription for unlimited meal plans'
            },
            unit_amount: 999, // $9.99 per month
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription/canceled`,
      subscription_data: {
        metadata: {
          tier: 'premium'
        }
      }
    });

    return session;
  },

  async cancelSubscription(subscriptionId: string) {
    try {
      return await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  },

  async handleWebhook(payload: string, signature: string) {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('Missing Stripe webhook secret');
      }

      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const [customer] = await db
            .select()
            .from(users)
            .where(eq(users.stripe_customer_id, customerId))
            .limit(1);

          if (customer) {
            await db
              .update(users)
              .set({
                stripe_subscription_id: subscription.id,
                subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
                subscription_tier: 'premium',
                subscription_end_date: new Date(subscription.current_period_end * 1000),
              })
              .where(eq(users.id, customer.id));
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const [customer] = await db
            .select()
            .from(users)
            .where(eq(users.stripe_customer_id, customerId))
            .limit(1);

          if (customer) {
            await db
              .update(users)
              .set({
                subscription_status: 'cancelled',
                subscription_tier: 'free',
                subscription_end_date: new Date(),
              })
              .where(eq(users.id, customer.id));
          }
          break;
        }
      }

      return true;
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  },
};