#!/usr/bin/env node

/**
 * Script to create a $9.99/month price for a Stripe product
 * Usage: node scripts/create-product-price.js [product_id]
 */

const Stripe = require('stripe');

// Load environment variables
require('dotenv').config();

const stripeKey = process.env.STRIPE_SECRET_KEY_DEV || process.env.STRIPE_SECRET_KEY_PROD;
if (!stripeKey) {
  console.error('❌ No Stripe secret key found in environment variables');
  console.error('   Make sure STRIPE_SECRET_KEY_DEV or STRIPE_SECRET_KEY_PROD is set');
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-12-18.acacia',
});

// Use environment-based product ID with fallback
function getProductId() {
  const isProduction = process.env.NODE_ENV === 'production';
  const key = isProduction ? 'STRIPE_PRODUCT_ID_PROD' : 'STRIPE_PRODUCT_ID_DEV';
  const envProductId = process.env[key];
  
  if (envProductId) {
    return envProductId;
  }
  
  // Fallback to command line argument or default
  return process.argv[2] || process.env.STRIPE_PRODUCT_ID || 'prod_SncR91waZDrn6E';
}

const productId = getProductId();

async function createPrice() {
  console.log(`🏷️  Creating $9.99/month price for product: ${productId}\n`);

  try {
    // First, verify the product exists
    const product = await stripe.products.retrieve(productId);
    console.log(`✅ Product found: ${product.name}`);

    // Check if a similar price already exists
    const existingPrices = await stripe.prices.list({ 
      product: productId,
      active: true,
      limit: 10
    });

    const existingMonthlyPrice = existingPrices.data.find(price => 
      price.recurring && 
      price.recurring.interval === 'month' && 
      price.unit_amount === 999
    );

    if (existingMonthlyPrice) {
      console.log(`\n⚠️  A $9.99/month price already exists: ${existingMonthlyPrice.id}`);
      console.log('   You can use this price ID in your code.');
      return;
    }

    // Create the new price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: 999, // $9.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
      nickname: 'Premium Monthly Subscription',
      metadata: {
        created_by: 'create-product-price script',
        description: 'Monthly subscription for unlimited meal plans'
      }
    });

    console.log('\n🎉 Price created successfully!');
    console.log(`   Price ID: ${price.id}`);
    console.log(`   Amount: $${price.unit_amount / 100}/${price.recurring.interval}`);
    console.log(`   Currency: ${price.currency.toUpperCase()}`);
    console.log(`   Product: ${price.product}`);

    console.log('\n📝 Next steps:');
    console.log(`   1. Update your code to use price ID: ${price.id}`);
    console.log('   2. Replace the price_data configuration with: { price: "' + price.id + '", quantity: 1 }');
    console.log('   3. Test the checkout flow');

  } catch (error) {
    if (error.code === 'resource_missing') {
      console.error(`❌ Product ${productId} not found`);
      console.error('   Please check the product ID is correct');
    } else {
      console.error('❌ Error creating price:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
createPrice().catch(console.error); 