#!/usr/bin/env node

/**
 * Script to check a Stripe product and its associated prices
 * Usage: node scripts/check-product-prices.js [product_id]
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

async function checkProduct() {
  console.log(`🔍 Checking product: ${productId}\n`);

  try {
    // Get product details
    const product = await stripe.products.retrieve(productId);
    console.log('✅ Product found:');
    console.log(`   Name: ${product.name}`);
    console.log(`   Description: ${product.description || 'No description'}`);
    console.log(`   Active: ${product.active}`);
    console.log(`   Created: ${new Date(product.created * 1000).toLocaleDateString()}\n`);

    // Get prices for this product
    console.log('🏷️  Fetching prices for this product...');
    const prices = await stripe.prices.list({ 
      product: productId,
      active: true,
      limit: 10
    });
    
    if (prices.data.length === 0) {
      console.log('❌ No active prices found for this product');
      console.log('\n💡 To use this product, you need to create a price:');
      console.log('   1. Go to Stripe Dashboard → Products');
      console.log(`   2. Find product "${product.name}"`);
      console.log('   3. Click "Add pricing" or "Create price"');
      console.log('   4. Set price to $9.99/month recurring');
      console.log('   5. Copy the price ID (starts with "price_")');
    } else {
      console.log(`✅ Found ${prices.data.length} active price(s):\n`);
      prices.data.forEach((price, index) => {
        const amount = price.unit_amount ? `$${price.unit_amount / 100}` : 'Custom';
        const interval = price.recurring ? `/${price.recurring.interval}` : ' (one-time)';
        const isRecurring = price.recurring ? '🔄' : '💰';
        
        console.log(`   ${isRecurring} ${price.id}`);
        console.log(`      Amount: ${amount}${interval} (${price.currency.toUpperCase()})`);
        console.log(`      Type: ${price.type}`);
        if (price.recurring) {
          console.log(`      Billing: Every ${price.recurring.interval_count} ${price.recurring.interval}(s)`);
        }
        console.log(`      Created: ${new Date(price.created * 1000).toLocaleDateString()}`);
        if (index < prices.data.length - 1) console.log('');
      });

      // Find a suitable monthly recurring price
      const monthlyPrice = prices.data.find(price => 
        price.recurring && 
        price.recurring.interval === 'month' && 
        price.unit_amount === 999
      );

      if (monthlyPrice) {
        console.log(`\n🎯 Perfect! Found matching $9.99/month price: ${monthlyPrice.id}`);
        console.log('   This price ID can be used to replace the price_data configuration.');
      } else {
        console.log('\n⚠️  No $9.99/month recurring price found.');
        console.log('   You may need to create one or adjust your code to use an existing price.');
      }
    }

  } catch (error) {
    if (error.code === 'resource_missing') {
      console.error(`❌ Product ${productId} not found`);
      console.error('   Please check the product ID is correct');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
checkProduct().catch(console.error); 