import Stripe from 'stripe';
import { db } from '../../db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { createFirebaseToken } from './firebase';
import { config } from '../config/environment';

// Configuration for subscription pricing
const SUBSCRIPTION_CONFIG = {
  // Option 1: Use a specific product/price from Stripe Dashboard
  PRODUCT_ID: config.stripeProductId, // Environment-based product ID
  PRICE_ID: config.stripePriceId || null, // Set this to use a specific price ID
  
  // Option 2: Fallback to dynamic price_data (current approach)
  FALLBACK_PRICE_DATA: {
    currency: 'usd',
    recurring: {
      interval: 'month' as const
    },
    product_data: {
      name: 'Premium Subscription',
      description: 'Monthly subscription for unlimited meal plans'
    },
    unit_amount: 999, // $9.99 per month
  }
};

const stripeKey = config.stripeSecretKey;
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

const baseUrl = config.baseUrl;

console.log('Base URL for webhooks:', baseUrl);

// Utility function to safely convert Stripe Unix timestamp to Date
function safeTimestampToDate(timestamp: number | null | undefined, context?: string): Date | null {
  console.log(`🔍 safeTimestampToDate called with:`, {
    timestamp,
    type: typeof timestamp,
    isNull: timestamp === null,
    isUndefined: timestamp === undefined,
    context: context || 'unknown context'
  });

  if (!timestamp || typeof timestamp !== 'number') {
    console.warn(`Invalid timestamp in ${context || 'unknown context'}:`, {
      timestamp,
      type: typeof timestamp,
      isNull: timestamp === null,
      isUndefined: timestamp === undefined
    });
    return null;
  }
  
  // Additional validation for reasonable timestamp values
  if (timestamp < 0 || timestamp > 2147483647) { // Max 32-bit Unix timestamp (year 2038)
    console.warn(`Timestamp out of reasonable range in ${context || 'unknown context'}:`, timestamp);
    return null;
  }

  console.log(`🔢 Converting timestamp ${timestamp} to date in ${context || 'unknown context'}`);
  
  try {
    const date = new Date(timestamp * 1000);
    console.log(`📅 Date conversion result:`, {
      timestamp,
      multiplied: timestamp * 1000,
      date: date.toISOString(),
      isValid: !isNaN(date.getTime()),
      context: context || 'unknown context'
    });
    
    if (isNaN(date.getTime())) {
      console.error(`Invalid date created from timestamp in ${context || 'unknown context'}:`, {
        timestamp,
        timestampType: typeof timestamp,
        multipliedValue: timestamp * 1000,
        resultingDate: date,
        dateString: date.toString(),
        dateTime: date.getTime()
      });
      return null;
    }
    
    return date;
  } catch (error) {
    console.error(`Exception during date conversion in ${context || 'unknown context'}:`, {
      timestamp,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });
    return null;
  }
}

// Helper function to get or create a price for the configured product
async function getOrCreatePrice(productId: string): Promise<string> {
  try {
    // First, check if there's already a suitable price for this product
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 10
    });

    // Look for a monthly recurring price with the right amount
    const existingPrice = prices.data.find(price => 
      price.recurring && 
      price.recurring.interval === 'month' && 
      price.unit_amount === SUBSCRIPTION_CONFIG.FALLBACK_PRICE_DATA.unit_amount
    );

    if (existingPrice) {
      console.log('Found existing price for product:', existingPrice.id);
      return existingPrice.id;
    }

    // If no suitable price exists, create one
    console.log('Creating new price for product:', productId);
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: SUBSCRIPTION_CONFIG.FALLBACK_PRICE_DATA.unit_amount,
      currency: SUBSCRIPTION_CONFIG.FALLBACK_PRICE_DATA.currency,
      recurring: SUBSCRIPTION_CONFIG.FALLBACK_PRICE_DATA.recurring,
      nickname: 'Premium Monthly Subscription',
      metadata: {
        created_by: 'stripe_service',
        description: SUBSCRIPTION_CONFIG.FALLBACK_PRICE_DATA.product_data.description
      }
    });

    console.log('Created new price:', newPrice.id);
    return newPrice.id;
  } catch (error) {
    console.error('Error getting/creating price for product:', productId, error);
    throw error;
  }
}

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

  async createCheckoutSession(customerId: string, couponCode?: string) {
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
      
      // Determine line item configuration
      let lineItem;
      if (SUBSCRIPTION_CONFIG.PRICE_ID) {
        // Use specific price ID from environment/config
        console.log('Using configured price ID:', SUBSCRIPTION_CONFIG.PRICE_ID);
        lineItem = {
          price: SUBSCRIPTION_CONFIG.PRICE_ID,
          quantity: 1,
        };
      } else {
        // Get or create a price for the configured product
        console.log('Getting/creating price for product:', SUBSCRIPTION_CONFIG.PRODUCT_ID);
        const priceId = await getOrCreatePrice(SUBSCRIPTION_CONFIG.PRODUCT_ID);
        lineItem = {
          price: priceId,
          quantity: 1,
        };
      }

      // Base session configuration
      const sessionConfig: any = {
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [lineItem],
        success_url: `${baseUrl}/#/subscription/success?session_id={CHECKOUT_SESSION_ID}&user_id=${user.id}&auth_token=${encodeURIComponent(firebaseToken)}`,
        cancel_url: `${baseUrl}/#/subscription/canceled?session_id={CHECKOUT_SESSION_ID}&user_id=${user.id}`,
        subscription_data: {
          metadata: {
            tier: 'premium',
            user_id: user.id.toString(),
            product_id: SUBSCRIPTION_CONFIG.PRODUCT_ID
          }
        },
        // Allow promotion codes to be entered during checkout
        allow_promotion_codes: true,
      };

      // Add coupon if provided
      if (couponCode) {
        try {
          // Verify the coupon exists and is valid
          const coupon = await stripe.coupons.retrieve(couponCode);
          console.log('Applying coupon to checkout session:', couponCode);
          sessionConfig.discounts = [{ coupon: couponCode }];
        } catch (error) {
          console.warn('Invalid coupon code provided:', couponCode, error);
          // Don't fail the checkout, just proceed without the coupon
        }
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      console.log('Checkout session created successfully:', {
        sessionId: session.id,
        customerId: session.customer,
        userId: user.id,
        successUrl: session.success_url,
        cancelUrl: session.cancel_url,
        couponApplied: !!couponCode
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
        couponCode,
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
      if (!config.stripeWebhookSecret) {
        throw new Error('Missing Stripe webhook secret');
      }

      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        config.stripeWebhookSecret
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
          
          // Check for any date-related fields in the event data before processing
          console.log('🔍 Pre-processing date field analysis:', {
            eventType: event.type,
            eventId: event.id,
            dataObject: event.data.object,
            dateFields: Object.entries(event.data.object).filter(([key, value]) => 
              key.includes('date') || key.includes('period') || key.includes('at') || key.includes('time')
            )
          });
          
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
                  currentPeriodEnd: safeTimestampToDate(subscription.current_period_end, 'subscription update'),
                  currentPeriodEndRaw: subscription.current_period_end,
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
                  subscription_end_date: safeTimestampToDate(subscription.current_period_end, `subscription ${subscription.id} update`)
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

                console.log('🔥 Processing subscription deletion webhook:', {
                  subscriptionId: subscription.id,
                  customerId,
                  status: subscription.status,
                  canceledAt: subscription.canceled_at,
                  currentPeriodEnd: subscription.current_period_end,
                  currentPeriodEndType: typeof subscription.current_period_end,
                  endedAt: subscription.ended_at,
                  endedAtType: typeof subscription.ended_at,
                  metadata: subscription.metadata,
                  fullSubscriptionObject: JSON.stringify(subscription, null, 2),
                  timestamp: new Date().toISOString()
                });

                const [customer] = await tx
                  .select()
                  .from(users)
                  .where(eq(users.stripe_customer_id, customerId))
                  .limit(1);

                if (!customer) {
                  console.error('❌ Customer not found for subscription deletion:', {
                    stripeCustomerId: customerId,
                    subscriptionId: subscription.id
                  });
                  throw new Error(`Customer not found for Stripe customerId: ${customerId}`);
                }

                console.log('👤 Found customer for subscription deletion:', {
                  userId: customer.id,
                  email: customer.email,
                  currentStatus: customer.subscription_status,
                  currentTier: customer.subscription_tier,
                  stripeSubscriptionId: customer.stripe_subscription_id
                });

                const subscriptionEndDate = safeTimestampToDate(subscription.current_period_end, `subscription ${subscription.id} deletion`);
                
                console.log('📅 Calculated subscription end date:', {
                  rawTimestamp: subscription.current_period_end,
                  calculatedDate: subscriptionEndDate,
                  subscriptionId: subscription.id
                });

                const [updatedUser] = await tx
                  .update(users)
                  .set({
                    subscription_status: 'cancelled' as const,
                    subscription_tier: 'free' as const,
                    subscription_end_date: subscriptionEndDate
                  })
                  .where(eq(users.id, customer.id))
                  .returning();

                if (!updatedUser) {
                  console.error('❌ Failed to update user in subscription deletion webhook:', {
                    userId: customer.id,
                    subscriptionId: subscription.id
                  });
                  throw new Error(`Failed to cancel subscription for user ${customer.id}`);
                }

                console.log('✅ Successfully processed subscription deletion webhook:', {
                  userId: updatedUser.id,
                  oldStatus: customer.subscription_status,
                  newStatus: updatedUser.subscription_status,
                  oldTier: customer.subscription_tier,
                  newTier: updatedUser.subscription_tier,
                  endDate: updatedUser.subscription_end_date,
                  subscriptionId: subscription.id,
                  timestamp: new Date().toISOString()
                });

                return { 
                  success: true, 
                  user: updatedUser,
                  metadata: subscription.metadata,
                  event: 'subscription_deleted'
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
            error: {
              name: lastError.name,
              message: lastError.message,
              stack: lastError.stack,
              type: lastError.constructor.name
            },
            eventType: event.type,
            eventId: event.id,
            timestamp: new Date().toISOString()
          });

          // Log specific details for date-related errors
          if (lastError.message.includes('Invalid time value') || lastError.name === 'RangeError') {
            console.error('Date parsing error detected in webhook:', {
              eventData: event.data.object,
              eventType: event.type,
              timestamp: new Date().toISOString()
            });
          }

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