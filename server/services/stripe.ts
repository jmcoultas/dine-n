import Stripe from 'stripe';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey || typeof stripeKey !== 'string') {
  throw new Error('Missing or invalid Stripe secret key');
}

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia',
});

const baseUrl = 'https://dine-n-johncoultas.replit.app';

console.log('Base URL for webhooks:', baseUrl);

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
    console.log('Creating checkout session for customer:', customerId);
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
      success_url: `${baseUrl}/#/subscription/success?session_id={CHECKOUT_SESSION_ID}&user_id=${customerId}`,
      cancel_url: `${baseUrl}/#/subscription/canceled?session_id={CHECKOUT_SESSION_ID}`,
      subscription_data: {
        metadata: {
          tier: 'premium'
        }
      }
    });

    console.log('Checkout session created:', {
      sessionId: session.id,
      successUrl: session.success_url,
      cancelUrl: session.cancel_url
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

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('Missing Stripe webhook secret');
      }

      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log('🔔 Processing webhook event:', {
        type: event.type,
        id: event.id,
        timestamp: new Date().toISOString(),
        object: event.data.object
      });

      // Start a transaction for database operations with retries
      const maxRetries = 3;
      let retryCount = 0;
      let lastError: Error | null = null;

      while (retryCount < maxRetries) {
        try {
          const result = await db.transaction(async (tx) => {
            switch (event.type) {
              case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const customerId = session.customer as string;

                console.log('Processing successful checkout:', {
                  sessionId: session.id,
                  customerId,
                  paymentStatus: session.payment_status,
                  metadata: session.metadata
                });

                if (session.payment_status !== 'paid') {
                  console.log('Checkout not paid yet, waiting for payment confirmation');
                  return { success: false, reason: 'payment_pending' };
                }

                const [customer] = await tx
                  .select()
                  .from(users)
                  .where(eq(users.stripe_customer_id, customerId))
                  .limit(1);

                if (!customer) {
                  throw new Error(`Customer not found for Stripe customerId: ${customerId}`);
                }

                // Calculate subscription end date (30 days from now)
                const subscriptionEndDate = new Date();
                subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

                const [updatedUser] = await tx
                  .update(users)
                  .set({
                    subscription_status: 'active' as const,
                    subscription_tier: 'premium' as const,
                    subscription_end_date: subscriptionEndDate
                  })
                  .where(eq(users.id, customer.id))
                  .returning();

                if (!updatedUser) {
                  throw new Error(`Failed to update user ${customer.id} subscription status`);
                }

                console.log('Successfully updated user subscription:', {
                  userId: customer.id,
                  newStatus: 'active',
                  newTier: 'premium',
                  endDate: subscriptionEndDate
                });

                return { 
                  success: true, 
                  user: updatedUser, 
                  event: 'checkout_completed',
                  metadata: session.metadata
                };
              }

              case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.billing_reason === 'subscription_create') {
                  console.log('Initial subscription invoice paid:', {
                    invoiceId: invoice.id,
                    customerId: invoice.customer
                  });
                }
                return { success: true, event: 'invoice_paid' };
              }

              case 'customer.subscription.created':
              case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                console.log('Processing subscription update:', {
                  subscriptionId: subscription.id,
                  customerId,
                  status: subscription.status,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  metadata: subscription.metadata
                });

                const [customer] = await tx
                  .select()
                  .from(users)
                  .where(eq(users.stripe_customer_id, customerId))
                  .limit(1);

                if (!customer) {
                  throw new Error(`Customer not found for Stripe customerId: ${customerId}`);
                }

                const getSubscriptionStatus = (stripeStatus: string): 'active' | 'inactive' | 'cancelled' => {
                  switch (stripeStatus) {
                    case 'active':
                    case 'trialing':
                      return 'active';
                    case 'canceled':
                    case 'unpaid':
                    case 'past_due':
                      return 'cancelled';
                    default:
                      return 'inactive';
                  }
                };

                const updateData = {
                  stripe_subscription_id: subscription.id,
                  subscription_status: getSubscriptionStatus(subscription.status) as 'active' | 'inactive' | 'cancelled',
                  subscription_tier: 'premium' as const,
                  subscription_end_date: new Date(subscription.current_period_end * 1000)
                };

                const [updatedUser] = await tx
                  .update(users)
                  .set(updateData)
                  .where(eq(users.id, customer.id))
                  .returning();

                if (!updatedUser) {
                  throw new Error(`Failed to update user ${customer.id} subscription status`);
                }

                return { 
                  success: true, 
                  user: updatedUser,
                  metadata: subscription.metadata
                };
              }

              case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                console.log('Processing subscription deletion:', {
                  subscriptionId: subscription.id,
                  customerId,
                  metadata: subscription.metadata
                });

                const [customer] = await tx
                  .select()
                  .from(users)
                  .where(eq(users.stripe_customer_id, customerId))
                  .limit(1);

                if (!customer) {
                  throw new Error(`Customer not found for Stripe customerId: ${customerId}`);
                }

                const [updatedUser] = await tx
                  .update(users)
                  .set({
                    subscription_status: 'cancelled' as const,
                    subscription_tier: 'free' as const,
                    subscription_end_date: new Date()
                  })
                  .where(eq(users.id, customer.id))
                  .returning();

                if (!updatedUser) {
                  throw new Error(`Failed to cancel subscription for user ${customer.id}`);
                }

                return { 
                  success: true, 
                  user: updatedUser,
                  metadata: subscription.metadata
                };
              }

              default: {
                console.log(`Unhandled event type: ${event.type}`);
                return { success: true, unhandled: true };
              }
            }
          });

          console.log('Webhook processing completed successfully:', {
            eventType: event.type,
            result
          });

          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`Webhook processing attempt ${retryCount + 1} failed:`, {
            error: lastError,
            timestamp: new Date().toISOString()
          });

          retryCount++;
          if (retryCount < maxRetries) {
            // Wait for an exponential backoff period before retrying
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }
      }

      // If we've exhausted all retries, throw the last error
      if (lastError) {
        throw lastError;
      }

      throw new Error('Unexpected webhook processing failure');
    } catch (error) {
      console.error('Error handling webhook:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },
};