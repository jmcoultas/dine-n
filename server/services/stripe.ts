import Stripe from 'stripe';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { createFirebaseToken } from './firebase';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey || typeof stripeKey !== 'string') {
  throw new Error('Missing or invalid Stripe secret key');
}

export const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia',
});

// Test function to verify Stripe connection
export async function testStripeConnection() {
  try {
    const account = await stripe.accounts.retrieve();
    console.log('Stripe connection successful:', {
      id: account.id,
      country: account.country,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled
    });
    return true;
  } catch (error) {
    console.error('Stripe connection failed:', error);
    return false;
  }
}

const baseUrl = 'https://dine-n.replit.app';

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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripe_customer_id, customerId))
      .limit(1);

    if (!user) {
      throw new Error('User not found for customer ID');
    }

    try {
      // Create a custom token for Firebase authentication
      const firebaseToken = await createFirebaseToken(user.id.toString());
      
      console.log('Creating Stripe checkout session with customer ID:', customerId);
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
        success_url: `${baseUrl}/#/subscription/success?session_id={CHECKOUT_SESSION_ID}&user_id=${user.id}&auth_token=${encodeURIComponent(firebaseToken)}`,
        cancel_url: `${baseUrl}/#/subscription/canceled?session_id={CHECKOUT_SESSION_ID}&user_id=${user.id}`,
        subscription_data: {
          metadata: {
            tier: 'premium',
            user_id: user.id.toString()
          }
        }
      });

      console.log('Checkout session created successfully:', {
        sessionId: session.id,
        customerId: session.customer,
        userId: user.id,
        successUrl: session.success_url,
        cancelUrl: session.cancel_url
      });

      // Double-check that the customer ID is properly stored in the database
      const [verifyUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      if (verifyUser?.stripe_customer_id !== customerId) {
        console.error('Customer ID mismatch after checkout session creation:', {
          expected: customerId,
          actual: verifyUser?.stripe_customer_id,
          userId: user.id
        });
        
        // Update the customer ID to ensure consistency
        await db
          .update(users)
          .set({ stripe_customer_id: customerId })
          .where(eq(users.id, user.id));
        
        console.log('Updated customer ID in database for consistency');
      }

      return session;
    } catch (error) {
      console.error('Stripe checkout session creation error:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        customerId,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
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
          console.log(`Webhook processing attempt ${retryCount + 1}/${maxRetries}`);
          const result = await db.transaction(async (tx) => {
            console.log('Transaction started for event:', event.type);
            
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

                console.log('Looking for customer in database with ID:', customerId);
                const [customer] = await tx
                  .select()
                  .from(users)
                  .where(eq(users.stripe_customer_id, customerId))
                  .limit(1);

                console.log('Database customer lookup result:', {
                  found: !!customer,
                  customerId: customer?.id,
                  email: customer?.email,
                  currentStatus: customer?.subscription_status,
                  currentTier: customer?.subscription_tier
                });

                if (!customer) {
                  console.log('Customer not found by stripe_customer_id, trying metadata fallback');
                  
                  // Try to find user by user_id in metadata
                  let userId: string | undefined;
                  if (session.subscription && typeof session.subscription === 'object') {
                    const subscription = session.subscription as Stripe.Subscription;
                    userId = subscription.metadata?.user_id;
                  }
                  
                  if (userId) {
                    console.log('Found user_id in metadata:', userId);
                    const [metadataUser] = await tx
                      .select()
                      .from(users)
                      .where(eq(users.id, parseInt(userId)))
                      .limit(1);
                    
                    if (metadataUser) {
                      console.log('Found user via metadata, updating stripe_customer_id');
                      // Update the user's stripe_customer_id to match the current session
                      await tx
                        .update(users)
                        .set({ stripe_customer_id: customerId })
                        .where(eq(users.id, metadataUser.id));
                      
                      // Use this user for the rest of the processing
                      const customer = metadataUser;
                      
                      // Extract subscription ID from session
                      const subscriptionId = typeof session.subscription === 'string' 
                        ? session.subscription 
                        : session.subscription?.id;

                      console.log('Extracted subscription ID from session:', {
                        subscriptionId,
                        sessionId: session.id,
                        subscriptionType: typeof session.subscription
                      });

                      // Calculate subscription end date (30 days from now)
                      const subscriptionEndDate = new Date();
                      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

                      console.log('Attempting database update for user (via metadata):', {
                        userId: customer.id,
                        subscriptionId,
                        subscriptionEndDate: subscriptionEndDate,
                        timestamp: new Date().toISOString()
                      });

                      const [updatedUser] = await tx
                        .update(users)
                        .set({
                          subscription_status: 'active' as const,
                          subscription_tier: 'premium' as const,
                          subscription_end_date: subscriptionEndDate,
                          stripe_customer_id: customerId,
                          stripe_subscription_id: subscriptionId || null
                        })
                        .where(eq(users.id, customer.id))
                        .returning();

                      console.log('Database update result (via metadata):', {
                        success: !!updatedUser,
                        userId: updatedUser?.id,
                        newStatus: updatedUser?.subscription_status,
                        newTier: updatedUser?.subscription_tier,
                        newEndDate: updatedUser?.subscription_end_date
                      });

                      if (!updatedUser) {
                        throw new Error(`Failed to update user ${customer.id} subscription status`);
                      }

                      console.log('Successfully updated user subscription (via metadata):', {
                        userId: customer.id,
                        newStatus: 'active',
                        newTier: 'premium',
                        endDate: subscriptionEndDate
                      });

                      return { 
                        success: true, 
                        user: updatedUser, 
                        event: 'checkout_completed',
                        metadata: session.metadata,
                        resolved_via: 'metadata'
                      };
                    }
                  }
                  
                  console.error('Customer not found in database:', {
                    stripeCustomerId: customerId,
                    sessionMetadata: session.metadata,
                    subscriptionMetadata: session.subscription && typeof session.subscription === 'object' ? (session.subscription as Stripe.Subscription).metadata : null,
                    allUsers: await tx.select({ id: users.id, email: users.email, stripe_customer_id: users.stripe_customer_id }).from(users).limit(10)
                  });
                  throw new Error(`Customer not found for Stripe customerId: ${customerId}`);
                }

                // Extract subscription ID from session
                const subscriptionId = typeof session.subscription === 'string' 
                  ? session.subscription 
                  : session.subscription?.id;

                console.log('Extracted subscription ID from session (main path):', {
                  subscriptionId,
                  sessionId: session.id,
                  subscriptionType: typeof session.subscription
                });

                // Calculate subscription end date (30 days from now)
                const subscriptionEndDate = new Date();
                subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

                console.log('Attempting database update for user:', {
                  userId: customer.id,
                  subscriptionId,
                  subscriptionEndDate: subscriptionEndDate,
                  timestamp: new Date().toISOString()
                });

                const [updatedUser] = await tx
                  .update(users)
                  .set({
                    subscription_status: 'active' as const,
                    subscription_tier: 'premium' as const,
                    subscription_end_date: subscriptionEndDate,
                    stripe_subscription_id: subscriptionId || null
                  })
                  .where(eq(users.id, customer.id))
                  .returning();

                console.log('Database update result:', {
                  success: !!updatedUser,
                  userId: updatedUser?.id,
                  newStatus: updatedUser?.subscription_status,
                  newTier: updatedUser?.subscription_tier,
                  newEndDate: updatedUser?.subscription_end_date
                });

                if (!updatedUser) {
                  console.error('Database update failed:', {
                    userId: customer.id,
                    timestamp: new Date().toISOString()
                  });
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

                // Always set status to active for valid subscription states
                const status = subscription.status === 'active' || subscription.status === 'trialing' 
                  ? 'active' as const 
                  : getSubscriptionStatus(subscription.status);

                const updateData = {
                  stripe_subscription_id: subscription.id,
                  subscription_status: status,
                  subscription_tier: status === 'active' ? 'premium' as const : 'free' as const,
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

                console.log('Successfully updated subscription status:', {
                  userId: customer.id,
                  status,
                  tier: updateData.subscription_tier,
                  endDate: updateData.subscription_end_date
                });

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
                    subscription_end_date: new Date(subscription.current_period_end * 1000)
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