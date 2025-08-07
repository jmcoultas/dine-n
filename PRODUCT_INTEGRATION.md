# Stripe Product Integration Guide

## Overview

Your subscription system has been updated to tie subscriptions to a specific product in your Stripe Dashboard (`prod_SncR91waZDrn6E`). This provides better organization, reporting, and management of your subscription offerings.

## What Changed

### Before (Dynamic Price Data)
- Subscriptions were created with inline `price_data`
- No connection to Stripe Dashboard products
- Pricing was hardcoded in the application

### After (Product Integration)
- Subscriptions are tied to a specific Stripe product
- Uses proper Price objects from Stripe Dashboard
- Centralized product management
- Better analytics and reporting

## Configuration Options

### Option 1: Automatic (Recommended)
The system will automatically:
1. Check if your product (`prod_SncR91waZDrn6E`) has a suitable $9.99/month price
2. Create one if it doesn't exist
3. Use that price for all subscriptions

**No configuration needed** - this works out of the box!

### Option 2: Specific Price ID (Advanced)
If you want to use a specific price ID, set the environment variable:

```bash
STRIPE_PRICE_ID=price_1234567890abcdef
```

In Replit: Go to Secrets tab and add `STRIPE_PRICE_ID` with your price ID.

## Setup Instructions

### Step 1: Run the Setup Script
```bash
node scripts/setup-product-integration.js
```

This script will:
- ✅ Verify your product exists
- 🔍 Check for existing suitable prices
- 🆕 Create a $9.99/month price if needed
- 📋 Show you exactly what to configure

### Step 2: Set Environment Variable (Optional)
If you want to use a specific price ID:
1. Go to Replit Secrets tab
2. Add `STRIPE_PRICE_ID` with the price ID from Step 1
3. Restart your application

### Step 3: Test the Integration
1. Go through your subscription flow
2. Check the Stripe Dashboard → Subscriptions
3. Verify the subscription is tied to your product

## Benefits

### 🎯 Better Organization
- All subscriptions tied to your product
- Clear product hierarchy in Stripe Dashboard
- Easier to manage multiple pricing tiers

### 📊 Enhanced Analytics
- Product-level revenue reporting
- Better insights into subscription performance
- Easier A/B testing of different prices

### 🔧 Easier Management
- Change prices in Stripe Dashboard without code updates
- Add multiple pricing tiers (annual, quarterly, etc.)
- Manage product metadata and descriptions centrally

### 🏷️ Coupon Compatibility
- Coupons work seamlessly with product-based pricing
- Better discount tracking and reporting
- Support for product-specific promotions

## File Changes Made

### `server/services/stripe.ts`
- Added `SUBSCRIPTION_CONFIG` with product ID
- Added `getOrCreatePrice()` helper function
- Updated `createCheckoutSession()` to use product-based pricing
- Added product_id to subscription metadata

### `server/config/environment.ts`
- Added `stripePriceId` configuration option
- Integrated with existing environment variable system

### Scripts Added
- `scripts/setup-product-integration.js` - Complete setup automation
- `scripts/check-product-prices.js` - Check existing prices
- `scripts/create-product-price.js` - Create new price if needed

## How It Works

1. **Price Resolution**:
   ```
   STRIPE_PRICE_ID set? → Use specific price ID
   ↓ No
   Check product for $9.99/month price → Use existing price
   ↓ No suitable price found
   Create new $9.99/month price → Use new price
   ```

2. **Subscription Creation**:
   ```
   User clicks upgrade → Create checkout session
   ↓
   Resolve price ID (see above)
   ↓
   Create session with product-tied price
   ↓
   Subscription tied to your product
   ```

## Troubleshooting

### Product Not Found
```
❌ Product prod_SncR91waZDrn6E not found
```
**Solution**: Verify the product ID in your Stripe Dashboard → Products

### No Suitable Price
```
⚠️ No $9.99/month recurring price found
```
**Solution**: Run `node scripts/create-product-price.js` to create one

### Environment Variable Issues
```
❌ No Stripe secret key found
```
**Solution**: Ensure `STRIPE_SECRET_KEY_DEV` or `STRIPE_SECRET_KEY_PROD` is set in Replit Secrets

## Testing

### 1. Verify Configuration
```bash
node scripts/check-product-prices.js prod_SncR91waZDrn6E
```

### 2. Test Subscription Flow
1. Go through onboarding
2. Select premium plan
3. Complete checkout with test card: `4242 4242 4242 4242`

### 3. Verify in Stripe Dashboard
1. Go to Stripe Dashboard → Subscriptions
2. Find your test subscription
3. Click on it and verify it shows your product name
4. Check that the line item references your product

## Migration Notes

### Existing Subscriptions
- Existing subscriptions will continue to work
- New subscriptions will use the product integration
- No impact on current customers

### Backwards Compatibility
- System falls back to price_data if product integration fails
- Existing coupon functionality preserved
- All webhook handling remains the same

## Next Steps

1. **Run the setup script** to get your price ID
2. **Set the environment variable** (optional but recommended)
3. **Test the integration** with a test subscription
4. **Monitor** the Stripe Dashboard for better insights

Your subscription system is now properly integrated with Stripe's product catalog! 🎉 