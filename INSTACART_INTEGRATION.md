# Instacart Integration

This document explains the Instacart integration that allows users to shop for ingredients from their meal plans and individual recipes through Instacart's platform.

## Overview

The integration uses the Instacart Developer Platform API to create shoppable lists and recipe pages. Users can:

1. **Shop entire meal plans** - Create an Instacart shopping list with all ingredients from their current meal plan
2. **Shop individual recipes** - Create an Instacart recipe page for a specific recipe with ingredients and instructions
3. **Find nearby retailers** - Get a list of nearby Instacart partner stores

## Setup

### 1. Get Instacart API Key

1. Sign up for the Instacart Developer Platform at [https://docs.instacart.com/developer_platform_api/](https://docs.instacart.com/developer_platform_api/)
2. Create a development API key
3. Add the key to your Replit secrets with the name `INSTACART_TEST_KEY`

### 2. Environment Configuration

The integration automatically detects the environment:
- **Development**: Uses `https://connect.dev.instacart.tools`
- **Production**: Uses `https://connect.instacart.com`

Update the `partnerLinkbackUrl` in `server/lib/instacart.ts` to match your domain:

```typescript
this.partnerLinkbackUrl = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/meal-plan'  // Update this
  : 'http://localhost:5173/meal-plan';
```

## Features

### 1. Meal Plan Shopping List

**Location**: Grocery List tab in Meal Plan page

**How it works**:
- Aggregates all ingredients from recipes in the current meal plan
- Normalizes ingredient names and standardizes units
- Creates an Instacart shopping list with the aggregated ingredients
- Opens the shopping list in a new tab

**Usage**:
```typescript
// Client-side API call
const result = await createInstacartShoppingList(mealPlanId, "My Meal Plan Shopping List");
window.open(result.instacart_url, '_blank');
```

### 2. Individual Recipe Shopping

**Location**: Recipe cards in Meal Plan page

**How it works**:
- Takes ingredients and instructions from a specific recipe
- Creates an Instacart recipe page with the recipe details
- Opens the recipe page in a new tab

**Usage**:
```typescript
// Client-side API call
const result = await createInstacartRecipePage(recipeId);
window.open(result.instacart_url, '_blank');
```

### 3. Nearby Retailers

**Location**: Available via API (not currently used in UI)

**How it works**:
- Fetches nearby Instacart partner stores based on postal code
- Can be used to customize the shopping experience

**Usage**:
```typescript
// Client-side API call
const retailers = await getNearbyRetailers("94105", "US");
```

## API Endpoints

### Server-side Endpoints

#### 1. Create Shopping List
```
POST /api/instacart/shopping-list
```

**Request Body**:
```json
{
  "meal_plan_id": 123,
  "title": "My Shopping List"
}
```

**Response**:
```json
{
  "success": true,
  "instacart_url": "https://www.instacart.com/store/shopping_list/...",
  "ingredient_count": 15
}
```

#### 2. Create Recipe Page
```
POST /api/instacart/recipe
```

**Request Body**:
```json
{
  "recipe_id": 456
}
```

**Response**:
```json
{
  "success": true,
  "instacart_url": "https://www.instacart.com/store/recipes/...",
  "recipe_name": "Chicken Stir Fry",
  "ingredient_count": 8
}
```

#### 3. Get Nearby Retailers
```
GET /api/instacart/retailers?postal_code=94105&country_code=US
```

**Response**:
```json
{
  "retailers": [
    {
      "retailer_key": "safeway",
      "name": "Safeway",
      "logo_url": "...",
      "delivery_available": true
    }
  ]
}
```

## Implementation Details

### Ingredient Processing

The integration includes sophisticated ingredient processing:

1. **Normalization**: Removes common prefixes like "fresh", "diced", "chopped"
2. **Unit Standardization**: Converts units to consistent formats (e.g., "tbsp" → "tablespoons")
3. **Aggregation**: Combines duplicate ingredients with the same name and unit
4. **Instacart Format**: Converts to Instacart's expected format with `name`, `display_text`, and `measurements`

### Error Handling

- **Authentication**: Validates API key and provides clear error messages
- **Rate Limiting**: Handles Instacart's rate limits gracefully
- **Validation**: Ensures ingredients and instructions are properly formatted
- **User Feedback**: Shows toast notifications for success/error states

### Security

- **Authentication Required**: All endpoints require user authentication
- **Ownership Validation**: Users can only create shopping lists for their own meal plans
- **API Key Protection**: Instacart API key is stored securely in environment variables

## User Experience

### Shopping Flow

1. **From Meal Plan**:
   - User goes to Meal Plan page → Grocery List tab
   - Clicks "Shop with Instacart" button
   - System aggregates all ingredients from meal plan
   - Creates Instacart shopping list
   - Opens in new tab for user to complete purchase

2. **From Individual Recipe**:
   - User views recipe card in Meal Plan
   - Clicks "Shop Ingredients" button
   - System creates Instacart recipe page
   - Opens in new tab with recipe details and ingredients

### UI Components

- **Green Instacart buttons** with shopping cart icons
- **Loading states** during API calls
- **Toast notifications** for feedback
- **Tooltips** explaining functionality

## Testing

### Manual Testing

1. **Set up test environment**:
   ```bash
   # Add your Instacart test key to Replit secrets
   INSTACART_TEST_KEY=your_test_key_here
   ```

2. **Run test script**:
   ```bash
   node test_instacart.js
   ```

3. **Test in application**:
   - Create a meal plan
   - Go to Grocery List tab
   - Click "Shop with Instacart"
   - Verify shopping list opens in Instacart

### API Testing

Use the provided `test_instacart.js` script to test the Instacart API directly:

```bash
INSTACART_TEST_KEY=your_key node test_instacart.js
```

## Configuration Options

### Instacart Service Configuration

In `server/lib/instacart.ts`:

```typescript
class InstacartService {
  constructor() {
    this.apiKey = process.env.INSTACART_TEST_KEY || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://connect.instacart.com' 
      : 'https://connect.dev.instacart.tools';
    this.partnerLinkbackUrl = `${config.baseUrl}/meal-plan`;
  }
}
```

### Landing Page Configuration

Both shopping lists and recipe pages include:
- **Partner linkback URL**: Brings users back to your app
- **Pantry items enabled**: Allows users to mark items they already have

## Troubleshooting

### Common Issues

1. **"INSTACART_TEST_KEY environment variable is required"**
   - Add your API key to Replit secrets

2. **"Instacart API error: 401"**
   - Check that your API key is valid and active

3. **"No ingredients found"**
   - Ensure your meal plan has recipes with ingredients

4. **"Failed to create shopping list"**
   - Check network connectivity
   - Verify API key permissions

### Debug Information

The integration includes extensive logging:
- Server logs show API requests/responses
- Client logs show user interactions
- Error messages provide specific details

## Future Enhancements

Potential improvements:
1. **Retailer selection**: Allow users to choose preferred stores
2. **Quantity adjustment**: Let users modify ingredient quantities
3. **Dietary filtering**: Filter ingredients based on dietary restrictions
4. **Price comparison**: Show price estimates from different retailers
5. **Order tracking**: Track Instacart order status

## Support

For issues with the integration:
1. Check the console logs for error details
2. Verify your Instacart API key is valid
3. Test with the provided test script
4. Review the Instacart Developer Platform documentation

For Instacart API issues:
- Visit [Instacart Developer Platform](https://docs.instacart.com/developer_platform_api/)
- Contact Instacart Technical Support via their Enterprise Service Desk 