# Environment Configuration Guide

This guide explains how to manage development and production secrets/API keys in your Replit project.

## Overview

The application now uses a centralized environment configuration system that automatically selects the appropriate API keys and secrets based on the `NODE_ENV` environment variable.

## How It Works

- **Development Mode** (`NODE_ENV` != 'production'): Uses variables with `_DEV` suffix
- **Production Mode** (`NODE_ENV` === 'production'): Uses variables with `_PROD` suffix
- **Fallback**: If dev/prod specific variables aren't found, falls back to the original variable names

## Setting Up Secrets in Replit

### 1. Access Replit Secrets
1. Open your Repl
2. Click on the "Secrets" tab in the left sidebar (lock icon)
3. Add your environment variables as described below

### 2. Development Environment Variables
Add these secrets for your development/testing environment:

```
OPENAI_API_KEY_DEV=your_openai_dev_key_here
INSTACART_API_KEY_DEV=your_instacart_dev_key_here
FIREBASE_PROJECT_ID_DEV=your_firebase_dev_project_id
FIREBASE_CLIENT_EMAIL_DEV=your_firebase_dev_client_email
FIREBASE_PRIVATE_KEY_DEV=your_firebase_dev_private_key
STRIPE_SECRET_KEY_DEV=sk_test_your_stripe_dev_key
STRIPE_PRICE_ID_DEV=price_your_dev_price_id
STRIPE_PRODUCT_ID_DEV=prod_your_dev_product_id
STRIPE_WEBHOOK_SECRET_DEV=whsec_your_dev_webhook_secret
CLOUDINARY_CLOUD_NAME_DEV=your_cloudinary_dev_cloud_name
CLOUDINARY_API_KEY_DEV=your_cloudinary_dev_api_key
CLOUDINARY_API_SECRET_DEV=your_cloudinary_dev_api_secret
DATABASE_URL_DEV=your_dev_database_url
```

### 3. Production Environment Variables
Add these secrets for your production environment:

```
OPENAI_API_KEY_PROD=your_openai_prod_key_here
INSTACART_API_KEY_PROD=your_instacart_prod_key_here
FIREBASE_PROJECT_ID_PROD=your_firebase_prod_project_id
FIREBASE_CLIENT_EMAIL_PROD=your_firebase_prod_client_email
FIREBASE_PRIVATE_KEY_PROD=your_firebase_prod_private_key
STRIPE_SECRET_KEY_PROD=sk_live_your_stripe_prod_key
STRIPE_PRICE_ID_PROD=price_your_prod_price_id
STRIPE_PRODUCT_ID_PROD=prod_your_prod_product_id
STRIPE_WEBHOOK_SECRET_PROD=whsec_your_prod_webhook_secret
CLOUDINARY_CLOUD_NAME_PROD=your_cloudinary_prod_cloud_name
CLOUDINARY_API_KEY_PROD=your_cloudinary_prod_api_key
CLOUDINARY_API_SECRET_PROD=your_cloudinary_prod_api_secret
DATABASE_URL_PROD=your_prod_database_url
```

## Migration from Current Setup

Your existing environment variables will continue to work as fallbacks:
- `OPENAI_API_KEY`
- `INSTACART_TEST_KEY` (⚠️ **Important**: This will only work if `INSTACART_API_KEY_DEV`/`INSTACART_API_KEY_PROD` are not set)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_PRODUCT_ID`
- `STRIPE_WEBHOOK_SECRET`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**⚠️ Critical for Instacart**: The system now prioritizes environment-specific keys over `INSTACART_TEST_KEY`. In production, you **must** set `INSTACART_API_KEY_PROD` with a production-approved API key.

Migration steps:
1. **Immediately**: Set `INSTACART_API_KEY_PROD` in your production environment secrets
2. Add other `_DEV` and `_PROD` versions as needed
3. Test that everything works
4. Optionally remove the old variables once you're confident

## How the Environment Detection Works

The system automatically detects the environment based on `NODE_ENV`:

- When you run `npm run dev`: Uses `_DEV` variables
- When you run `npm run build` or `npm start`: Uses `_PROD` variables
- In Replit's deployment: Uses `_PROD` variables (since `NODE_ENV=production` is set)

## Configuration File

All environment logic is centralized in `server/config/environment.ts`. This file:

1. Automatically selects the right variables based on `NODE_ENV`
2. Provides fallbacks to existing variable names
3. Logs configuration status on startup (without exposing sensitive values)
4. Exports a typed configuration object for use throughout the application

## Benefits

✅ **Separation of Concerns**: Clear distinction between dev and prod secrets
✅ **Security**: Production keys are never used in development
✅ **Flexibility**: Easy to switch between environments
✅ **Backward Compatible**: Existing setup continues to work
✅ **Type Safety**: TypeScript interfaces ensure correct usage
✅ **Debugging**: Logs help identify missing or incorrect configuration

## Best Practices

1. **Use Test/Sandbox Keys for Development**: Always use test/sandbox versions of API keys for development
2. **Separate Databases**: Use different databases for dev and prod
3. **Monitor Usage**: Keep track of API usage in both environments
4. **Secure Production Keys**: Never share or commit production API keys
5. **Regular Rotation**: Rotate API keys regularly for security

## Troubleshooting

### Missing Environment Variables
Check the console logs on startup. The system will log which variables are missing and which are present (without exposing the actual values).

### Fallback Behavior
If a `_DEV` or `_PROD` variable is missing, the system will automatically fall back to the original variable name (e.g., `OPENAI_API_KEY_DEV` → `OPENAI_API_KEY`).

### Environment Detection Issues
Verify that `NODE_ENV` is being set correctly:
- Development: `NODE_ENV` should be undefined or not equal to 'production'
- Production: `NODE_ENV` should be 'production'

### Instacart API "Not Authorized" Error
If you're getting authorization errors with Instacart in production:

1. **Check Environment Variable Priority**: The system now uses this order:
   - Production: `INSTACART_API_KEY_PROD` → `INSTACART_TEST_KEY` (fallback)
   - Development: `INSTACART_API_KEY_DEV` → `INSTACART_TEST_KEY` (fallback)

2. **Verify Production API Key**: Ensure your `INSTACART_API_KEY_PROD` is:
   - Set in your production environment secrets
   - Approved by Instacart for the production endpoint (`https://connect.instacart.com`)
   - Not a development/test key

3. **Check Server Logs**: Look for these log messages on startup:
   ```
   Environment variable selection: INSTACART_API_KEY_DEV/INSTACART_API_KEY_PROD -> using INSTACART_API_KEY_PROD (production: true)
   ```

4. **Test Configuration**: Use the test script to verify your setup:
   ```bash
   node test_environment_config.js
   ``` 