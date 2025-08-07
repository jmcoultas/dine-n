#!/usr/bin/env node

/**
 * Script to create Stripe coupons for testing
 * Usage: node scripts/create-stripe-coupon.js
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

async function createCoupons() {
  console.log('🎫 Creating Stripe coupons...\n');

  try {
    // 1. Percentage discount coupon
    const percentCoupon = await stripe.coupons.create({
      id: 'WELCOME25',
      percent_off: 25,
      duration: 'once',
      name: 'Welcome 25% Off',
      metadata: {
        description: 'New customer welcome discount',
        created_by: 'create-stripe-coupon script'
      }
    });
    console.log('✅ Created percentage coupon:');
    console.log(`   Code: ${percentCoupon.id}`);
    console.log(`   Discount: ${percentCoupon.percent_off}% off`);
    console.log(`   Duration: ${percentCoupon.duration}\n`);

    // 2. Fixed amount discount coupon
    const fixedCoupon = await stripe.coupons.create({
      id: 'SAVE500',
      amount_off: 500, // $5.00 in cents
      currency: 'usd',
      duration: 'once',
      name: '$5 Off Premium',
      metadata: {
        description: 'Fixed $5 discount',
        created_by: 'create-stripe-coupon script'
      }
    });
    console.log('✅ Created fixed amount coupon:');
    console.log(`   Code: ${fixedCoupon.id}`);
    console.log(`   Discount: $${fixedCoupon.amount_off / 100} off`);
    console.log(`   Duration: ${fixedCoupon.duration}\n`);

    // 3. Repeating discount coupon (for subscriptions)
    const repeatingCoupon = await stripe.coupons.create({
      id: 'STUDENT50',
      percent_off: 50,
      duration: 'repeating',
      duration_in_months: 6,
      name: 'Student 50% Off - 6 Months',
      metadata: {
        description: 'Student discount for 6 months',
        created_by: 'create-stripe-coupon script'
      }
    });
    console.log('✅ Created repeating coupon:');
    console.log(`   Code: ${repeatingCoupon.id}`);
    console.log(`   Discount: ${repeatingCoupon.percent_off}% off`);
    console.log(`   Duration: ${repeatingCoupon.duration} for ${repeatingCoupon.duration_in_months} months\n`);

    console.log('🎉 All coupons created successfully!');
    console.log('\n📝 Test these coupon codes in your app:');
    console.log('   • WELCOME25 - 25% off once');
    console.log('   • SAVE500 - $5 off once');
    console.log('   • STUDENT50 - 50% off for 6 months');

  } catch (error) {
    if (error.code === 'resource_already_exists') {
      console.log('ℹ️  Some coupons already exist. Listing existing coupons...\n');
      
      // List existing coupons
      const coupons = await stripe.coupons.list({ limit: 10 });
      coupons.data.forEach(coupon => {
        console.log(`   • ${coupon.id} - ${coupon.percent_off ? coupon.percent_off + '% off' : '$' + (coupon.amount_off / 100) + ' off'}`);
      });
    } else {
      console.error('❌ Error creating coupons:', error.message);
      process.exit(1);
    }
  }
}

// Run the script
createCoupons().catch(console.error); 