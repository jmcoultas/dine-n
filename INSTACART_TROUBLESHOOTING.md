# Instacart Integration Troubleshooting Guide

## Issue: "Please check ingredient formatting" Error

This error occurs when the Instacart API receives invalid ingredient data. Here's how to diagnose and fix the issue:

## Recent Fixes Applied

1. **Fixed Instacart API Format**: Updated to match official Instacart API specification
   - Changed `measurements` to `line_item_measurements` as required by the API
   - Changed quantity from `number` to `string` type as expected by Instacart
   - Updated based on official documentation at https://docs.instacart.com/developer_platform_api/guide/concepts/shopping_list

2. **Environment Configuration Fix**: Fixed mismatch between expected environment variable names
   - The service was looking for `INSTACART_TEST_KEY` but config was expecting `INSTACART_API_KEY_DEV/PROD`
   - Updated config to prioritize `INSTACART_TEST_KEY` for backward compatibility

3. **Enhanced Ingredient Validation**: Added detailed logging and validation for ingredients
   - Both shopping list and recipe endpoints now validate ingredients before sending to Instacart
   - Invalid ingredients are filtered out with detailed logging of why they failed

4. **Added Debugging Endpoints**: Created debug endpoints to check configuration

## Debugging Steps

### 1. Check Instacart Configuration
Visit: `http://localhost:3001/api/debug/instacart-config` (or your server URL)

This will show:
- Whether the Instacart API key is properly configured
- Which environment variables are present
- The length of the API key (without exposing the actual key)

### 2. Check Server Logs
When you try to use the Instacart integration, check the server console for:
- Ingredient validation details
- API request/response information  
- Any error messages from the Instacart API

### 3. Common Issues and Solutions

#### Issue: API Key Not Configured
**Symptoms**: Service shows as not configured in debug endpoint
**Solution**: Set the `INSTACART_TEST_KEY` environment variable with your Instacart API key

#### Issue: Invalid Ingredients
**Symptoms**: Ingredients are being filtered out during validation
**Solution**: Check server logs for ingredient validation details. Common problems:
- Missing `name`, `amount`, or `unit` fields
- Empty string values
- Zero or negative amounts
- Non-string units or names

#### Issue: API Request Failures
**Symptoms**: 400/422 errors from Instacart API
**Solution**: Check the full request body logged to console and verify:
- All ingredients have valid names, amounts, and units
- Units are in expected format (cups, tablespoons, etc.)
- Ingredient names are clean (no special characters that might cause issues)

## Testing the Fix

1. **Start the server** and check the console for any Instacart service initialization messages
2. **Visit the debug endpoint** to verify configuration
3. **Try creating an Instacart shopping list** from a meal plan
4. **Check server logs** for detailed ingredient processing information
5. **If issues persist**, look for specific ingredient validation failures in the logs

## Environment Setup

Ensure you have the `INSTACART_TEST_KEY` environment variable set:
```bash
# In your .env file or environment
INSTACART_TEST_KEY=your_instacart_api_key_here
```

The API key should be obtained from the [Instacart Developer Platform](https://docs.instacart.com/developer_platform_api/).

## Next Steps

If the issue persists after these fixes:
1. Check the debug endpoint output
2. Review server logs for ingredient validation details
3. Verify that your meal plan recipes have properly formatted ingredients
4. Ensure the Instacart API key is valid and has the necessary permissions 