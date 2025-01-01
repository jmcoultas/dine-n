import Stripe from 'stripe';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing Stripe secret key');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Price IDs for your subscription plans
export const SUBSCRIPTION_PRICES = {
  PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_placeholder',
};

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
          stripeCustomerId: customer.id,
        })
        .where(eq(users.id, userId));

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  },

  async createSubscription(customerId: string, priceId: string) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  },

  async cancelSubscription(subscriptionId: string) {
    try {
      return await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  },

  async createCheckoutSession(customerId: string, priceId: string) {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription/canceled`,
    });

    return session;
  },

  async handleWebhook(payload: any, sig: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const [customer] = await db
            .select()
            .from(users)
            .where(eq(users.stripeCustomerId, customerId))
            .limit(1);

          if (customer) {
            await db
              .update(users)
              .set({
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: subscription.status === 'active' ? 'active' : 'inactive',
                subscriptionTier: 'premium',
                subscriptionEndDate: new Date(subscription.current_period_end * 1000),
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
            .where(eq(users.stripeCustomerId, customerId))
            .limit(1);

          if (customer) {
            await db
              .update(users)
              .set({
                subscriptionStatus: 'cancelled',
                subscriptionTier: 'free',
                subscriptionEndDate: new Date(),
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
