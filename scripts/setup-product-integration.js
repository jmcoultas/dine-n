#!/usr/bin/env node

/**
 * Script to set up product integration with Stripe
 * This will check your product, create a price if needed, and show you what to set in your environment
 * Usage: node scripts/setup-product-integration.js [product_id]
 */

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

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

const productId = process.argv[2] || 'prod_SncR91waZDrn6E';

async function setupProductIntegration() {
  console.log('🚀 Setting up Stripe product integration...\n');
  console.log(`Product ID: ${productId}\n`);

  try {
    // Step 1: Verify product exists
    console.log('1️⃣  Checking if product exists...');
    const product = await stripe.products.retrieve(productId);
    console.log(`   ✅ Product found: "${product.name}"`);
    console.log(`   📝 Description: ${product.description || 'No description'}`);
    console.log(`   🔄 Active: ${product.active}\n`);

    // Step 2: Check for existing prices
    console.log('2️⃣  Checking for existing prices...');
    const prices = await stripe.prices.list({ 
      product: productId,
      active: true,
      limit: 10
    });

    let targetPriceId = null;

    if (prices.data.length > 0) {
      console.log(`   Found ${prices.data.length} active price(s):`);
      prices.data.forEach(price => {
        const amount = price.unit_amount ? `$${price.unit_amount / 100}` : 'Custom';
        const interval = price.recurring ? `/${price.recurring.interval}` : ' (one-time)';
        const isTarget = price.recurring && 
                        price.recurring.interval === 'month' && 
                        price.unit_amount === 999;
        
        console.log(`   ${isTarget ? '🎯' : '  '} ${price.id} - ${amount}${interval}`);
        
        if (isTarget) {
          targetPriceId = price.id;
        }
      });
    } else {
      console.log('   ⚠️  No active prices found');
    }

    // Step 3: Create price if needed
    if (!targetPriceId) {
      console.log('\n3️⃣  Creating $9.99/month price...');
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: 999, // $9.99 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
        nickname: 'Premium Monthly Subscription',
        metadata: {
          created_by: 'setup-product-integration script',
          description: 'Monthly subscription for unlimited meal plans'
        }
      });

      targetPriceId = newPrice.id;
      console.log(`   ✅ Created price: ${targetPriceId}`);
    } else {
      console.log(`\n3️⃣  Using existing price: ${targetPriceId}`);
    }

    // Step 4: Show integration instructions
    console.log('\n🎉 Setup complete! Here\'s what to do next:\n');
    
    console.log('📋 OPTION 1: Set environment variable (Recommended)');
    console.log('   Add this to your environment variables:');
    console.log(`   STRIPE_PRICE_ID=${targetPriceId}`);
    console.log('');
    console.log('   In Replit: Go to Secrets tab and add:');
    console.log(`   STRIPE_PRICE_ID=${targetPriceId}`);
    console.log('');
    
    console.log('📋 OPTION 2: Update code directly');
    console.log('   In server/services/stripe.ts, change:');
    console.log('   PRICE_ID: process.env.STRIPE_PRICE_ID || null,');
    console.log('   to:');
    console.log(`   PRICE_ID: "${targetPriceId}",`);
    console.log('');

    console.log('🔄 Your subscription will now be tied to:');
    console.log(`   Product: ${product.name} (${productId})`);
    console.log(`   Price: $9.99/month (${targetPriceId})`);
    console.log('');

    console.log('✅ Benefits of using product integration:');
    console.log('   • Centralized product management in Stripe Dashboard');
    console.log('   • Easy price changes without code updates');
    console.log('   • Better reporting and analytics');
    console.log('   • Support for multiple price tiers');
    console.log('   • Consistent product data across all systems');

    // Step 5: Test the integration
    console.log('\n🧪 To test the integration:');
    console.log('   1. Set the environment variable above');
    console.log('   2. Restart your application');
    console.log('   3. Go through the subscription flow');
    console.log('   4. Check the Stripe Dashboard to see the subscription tied to your product');

  } catch (error) {
    if (error.code === 'resource_missing') {
      console.error(`❌ Product ${productId} not found`);
      console.error('   Please check the product ID is correct');
      console.error('   You can find your product ID in the Stripe Dashboard → Products');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
setupProductIntegration().catch(console.error); 