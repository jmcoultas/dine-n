interface InstacartIngredient {
  name: string;
  display_text: string;
  measurements: Array<{
    quantity: number;
    unit: string;
  }>;
}

interface InstacartShoppingListRequest {
  title: string;
  line_items: InstacartIngredient[];
  landing_page_configuration?: {
    partner_linkback_url?: string;
    enable_pantry_items?: boolean;
  };
}

interface InstacartShoppingListResponse {
  products_link_url: string;
}

interface InstacartRecipeRequest {
  title: string;
  image_url?: string;
  instructions: string[];
  ingredients: InstacartIngredient[];
  landing_page_configuration?: {
    partner_linkback_url?: string;
    enable_pantry_items?: boolean;
  };
}

interface InstacartRecipeResponse {
  products_link_url: string;
}

class InstacartService {
  private apiKey: string;
  private baseUrl: string;
  private partnerLinkbackUrl: string;

  constructor() {
    this.apiKey = process.env.INSTACART_TEST_KEY || '';
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://connect.instacart.com' 
      : 'https://connect.dev.instacart.tools';
    this.partnerLinkbackUrl = process.env.NODE_ENV === 'production'
      ? 'https://your-domain.com/meal-plan'
      : 'http://localhost:5173/meal-plan';
    
    console.log('InstacartService constructor - API Key present:', !!this.apiKey);
    console.log('InstacartService constructor - API Key length:', this.apiKey?.length || 0);
    console.log('InstacartService constructor - Base URL:', this.baseUrl);
    console.log('InstacartService constructor - NODE_ENV:', process.env.NODE_ENV);
    
    if (!this.apiKey) {
      console.error('INSTACART_TEST_KEY environment variable is missing');
      console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('INSTACART')));
      
      // For development, we'll allow the service to be created but methods will fail gracefully
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Running in development mode without Instacart API key - API calls will fail');
      } else {
        throw new Error('INSTACART_TEST_KEY environment variable is required');
      }
    }
  }

  private normalizeIngredientName(name: string): string {
    let normalized = name.toLowerCase()
      // Remove common preparation adjectives
      .replace(/^(fresh|dried|frozen|canned|diced|sliced|chopped|minced|ground|cooked|raw|organic|free-range|grass-fed|wild-caught)\s+/, '')
      // Remove parenthetical information
      .replace(/\([^)]*\)/g, '')
      // Remove everything after commas (often additional descriptions)
      .replace(/,.*$/, '')
      // Remove brand names and common descriptors
      .replace(/\b(brand|extra|super|premium|quality|grade|pure|natural|whole|lean|boneless|skinless)\b\s*/gi, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    // Apply common ingredient name mappings for better matching
    const ingredientMappings: Record<string, string> = {
      // Proteins
      'chicken breast': 'chicken breast',
      'chicken thigh': 'chicken thighs',
      'chicken thighs': 'chicken thighs',
      'ground beef': 'ground beef',
      'ground turkey': 'ground turkey',
      'beef': 'beef',
      'pork': 'pork',
      'salmon': 'salmon',
      'shrimp': 'shrimp',
      'eggs': 'eggs',
      'egg': 'eggs',
      
      // Vegetables
      'bell pepper': 'bell peppers',
      'red bell pepper': 'red bell peppers',
      'green bell pepper': 'green bell peppers',
      'yellow bell pepper': 'yellow bell peppers',
      'sweet potato': 'sweet potatoes',
      'potato': 'potatoes',
      'red onion': 'red onions',
      'yellow onion': 'yellow onions',
      'white onion': 'white onions',
      'onion': 'onions',
      'green onion': 'green onions',
      'scallion': 'green onions',
      'roma tomato': 'roma tomatoes',
      'cherry tomato': 'cherry tomatoes',
      'grape tomato': 'grape tomatoes',
      'tomato': 'tomatoes',
      'carrot': 'carrots',
      'celery': 'celery',
      'broccoli': 'broccoli',
      'spinach': 'spinach',
      'lettuce': 'lettuce',
      'cucumber': 'cucumber',
      'zucchini': 'zucchini',
      'mushroom': 'mushrooms',
      'mushrooms': 'mushrooms',
      
      // Oils and fats
      'olive oil': 'olive oil',
      'vegetable oil': 'vegetable oil',
      'canola oil': 'canola oil',
      'coconut oil': 'coconut oil',
      'butter': 'butter',
      'unsalted butter': 'butter',
      'salted butter': 'butter',
      
      // Dairy
      'milk': 'milk',
      'whole milk': 'milk',
      'heavy cream': 'heavy cream',
      'heavy whipping cream': 'heavy cream',
      'sour cream': 'sour cream',
      'cream cheese': 'cream cheese',
      'cheddar cheese': 'cheddar cheese',
      'mozzarella cheese': 'mozzarella cheese',
      'parmesan cheese': 'parmesan cheese',
      'cheese': 'cheese',
      'yogurt': 'yogurt',
      
      // Pantry staples
      'all-purpose flour': 'flour',
      'bread flour': 'flour',
      'whole wheat flour': 'flour',
      'flour': 'flour',
      'brown sugar': 'brown sugar',
      'white sugar': 'sugar',
      'granulated sugar': 'sugar',
      'sugar': 'sugar',
      'powdered sugar': 'powdered sugar',
      'confectioners sugar': 'powdered sugar',
      'baking powder': 'baking powder',
      'baking soda': 'baking soda',
      'vanilla extract': 'vanilla extract',
      'salt': 'salt',
      'black pepper': 'black pepper',
      'pepper': 'black pepper',
      'rice': 'rice',
      'pasta': 'pasta',
      
      // Aromatics
      'garlic clove': 'garlic',
      'garlic': 'garlic',
      'ginger': 'ginger',
      'fresh ginger': 'ginger',
      'lemon': 'lemons',
      'lime': 'limes',
      'orange': 'oranges',
      'onion powder': 'onion powder',
      'garlic powder': 'garlic powder',
      
      // Herbs and spices
      'basil': 'basil',
      'oregano': 'oregano',
      'thyme': 'thyme',
      'rosemary': 'rosemary',
      'parsley': 'parsley',
      'cilantro': 'cilantro',
      'paprika': 'paprika',
      'cumin': 'cumin',
      'cinnamon': 'cinnamon',
      'chili powder': 'chili powder'
    };
    
    return ingredientMappings[normalized] || normalized;
  }

  private standardizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      // Weight units
      'g': 'grams',
      'gram': 'grams',
      'grams': 'grams',
      'kg': 'kilograms',
      'kilogram': 'kilograms',
      'kilograms': 'kilograms',
      'oz': 'ounces',
      'ounce': 'ounces',
      'ounces': 'ounces',
      'lb': 'pounds',
      'lbs': 'pounds',
      'pound': 'pounds',
      'pounds': 'pounds',
      
      // Volume units
      'ml': 'milliliters',
      'milliliter': 'milliliters',
      'milliliters': 'milliliters',
      'l': 'liters',
      'liter': 'liters',
      'liters': 'liters',
      'fl oz': 'fluid ounces',
      'fluid ounce': 'fluid ounces',
      'fluid ounces': 'fluid ounces',
      'pt': 'pints',
      'pint': 'pints',
      'pints': 'pints',
      'qt': 'quarts',
      'quart': 'quarts',
      'quarts': 'quarts',
      'gal': 'gallons',
      'gallon': 'gallons',
      'gallons': 'gallons',
      
      // Cooking measurements
      'tsp': 'teaspoons',
      'teaspoon': 'teaspoons',
      'teaspoons': 'teaspoons',
      'tbsp': 'tablespoons',
      'tablespoon': 'tablespoons',
      'tablespoons': 'tablespoons',
      'cup': 'cups',
      'cups': 'cups',
      
      // Count units
      'piece': 'pieces',
      'pieces': 'pieces',
      'item': 'items',
      'items': 'items',
      'each': 'each',
      'whole': 'whole',
      'clove': 'cloves',
      'cloves': 'cloves',
      'slice': 'slices',
      'slices': 'slices',
      'bunch': 'bunches',
      'bunches': 'bunches',
      'head': 'heads',
      'heads': 'heads',
      'stalk': 'stalks',
      'stalks': 'stalks',
      'sprig': 'sprigs',
      'sprigs': 'sprigs',
      'leaf': 'leaves',
      'leaves': 'leaves',
      'can': 'cans',
      'cans': 'cans',
      'jar': 'jars',
      'jars': 'jars',
      'bottle': 'bottles',
      'bottles': 'bottles',
      'package': 'packages',
      'packages': 'packages',
      'bag': 'bags',
      'bags': 'bags',
      'box': 'boxes',
      'boxes': 'boxes',
      
      // Size descriptors
      'large': 'large',
      'medium': 'medium',
      'small': 'small',
      'extra large': 'extra large',
      'extra small': 'extra small',
    };
    
    const normalized = unit.toLowerCase().trim();
    return unitMap[normalized] || normalized;
  }

  private aggregateIngredients(ingredients: Array<{ name: string; amount: number; unit: string }>): InstacartIngredient[] {
    const aggregated: Record<string, { 
      originalName: string; 
      normalizedName: string; 
      amount: number; 
      unit: string;
      displayText: string;
    }> = {};
    
    ingredients.forEach(ingredient => {
      const normalizedName = this.normalizeIngredientName(ingredient.name);
      const standardUnit = this.standardizeUnit(ingredient.unit);
      const key = `${normalizedName}-${standardUnit}`;
      
      if (!aggregated[key]) {
        aggregated[key] = {
          originalName: ingredient.name,
          normalizedName: normalizedName,
          amount: ingredient.amount,
          unit: standardUnit,
          displayText: this.generateDisplayText(ingredient.name, ingredient.amount, standardUnit)
        };
      } else {
        aggregated[key].amount += ingredient.amount;
        // Update display text with new amount
        aggregated[key].displayText = this.generateDisplayText(
          aggregated[key].originalName, 
          aggregated[key].amount, 
          standardUnit
        );
      }
    });

    return Object.values(aggregated).map(item => ({
      name: item.normalizedName,
      display_text: item.displayText,
      measurements: [{
        quantity: item.amount,
        unit: item.unit
      }]
    }));
  }

  private generateDisplayText(name: string, amount: number, unit: string): string {
    // Format the amount nicely
    const formattedAmount = amount % 1 === 0 ? amount.toString() : amount.toFixed(2).replace(/\.?0+$/, '');
    
    // Create a clean display text
    const cleanName = name.replace(/^(fresh|dried|frozen|canned|diced|sliced|chopped|minced|ground|cooked|raw|organic)\s+/i, '');
    
    return `${formattedAmount} ${unit} ${cleanName}`.trim();
  }

  async createShoppingList(
    ingredients: Array<{ name: string; amount: number; unit: string }>,
    title: string = 'My Meal Plan Shopping List'
  ): Promise<InstacartShoppingListResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Instacart API key is not configured. Please set INSTACART_TEST_KEY environment variable.');
      }
      
      // Filter and validate ingredients
      const validIngredients = ingredients.filter(ingredient => {
        const isValid = ingredient.name && 
                       ingredient.name.trim().length > 0 && 
                       ingredient.amount && 
                       ingredient.amount > 0 && 
                       ingredient.unit && 
                       ingredient.unit.trim().length > 0;
        
        if (!isValid) {
          console.warn('Skipping invalid ingredient:', ingredient);
        }
        
        return isValid;
      });
      
      if (validIngredients.length === 0) {
        throw new Error('No valid ingredients found to create shopping list');
      }
      
      const aggregatedIngredients = this.aggregateIngredients(validIngredients);
      
      const requestBody: InstacartShoppingListRequest = {
        title,
        line_items: aggregatedIngredients,
        landing_page_configuration: {
          partner_linkback_url: this.partnerLinkbackUrl,
          enable_pantry_items: true
        }
      };

      console.log('Creating Instacart shopping list:', {
        title,
        originalIngredientCount: ingredients.length,
        validIngredientCount: validIngredients.length,
        aggregatedIngredientCount: aggregatedIngredients.length,
        sampleValidIngredients: validIngredients.slice(0, 3),
        sampleAggregatedIngredients: aggregatedIngredients.slice(0, 3)
      });
      
      // Log the exact request structure for debugging
      console.log('Full Instacart request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/idp/v1/products/products_link`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Instacart API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          requestBody: JSON.stringify(requestBody, null, 2)
        });
        
        // Provide more specific error messages
        let errorMessage = `Instacart API error: ${response.status}`;
        if (response.status === 404) {
          errorMessage = 'Instacart API endpoint not found. This may indicate an API configuration issue.';
        } else if (response.status === 401) {
          errorMessage = 'Instacart API authentication failed. Please check your API key.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid request data sent to Instacart API. Please check ingredient formatting.';
        } else if (response.status === 422) {
          errorMessage = 'Instacart could not process the ingredient data. This may be due to poor ingredient matching.';
        } else if (response.status >= 500) {
          errorMessage = 'Instacart API server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Instacart shopping list created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating Instacart shopping list:', error);
      throw error;
    }
  }

  async createRecipePage(
    recipeName: string,
    ingredients: Array<{ name: string; amount: number; unit: string }>,
    instructions: string[],
    imageUrl?: string
  ): Promise<InstacartRecipeResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Instacart API key is not configured. Please set INSTACART_TEST_KEY environment variable.');
      }
      const aggregatedIngredients = this.aggregateIngredients(ingredients);
      
      const requestBody: InstacartRecipeRequest = {
        title: recipeName,
        image_url: imageUrl,
        instructions,
        ingredients: aggregatedIngredients,
        landing_page_configuration: {
          partner_linkback_url: this.partnerLinkbackUrl,
          enable_pantry_items: true
        }
      };

      console.log('Creating Instacart recipe page:', {
        title: recipeName,
        ingredientCount: aggregatedIngredients.length,
        instructionCount: instructions.length
      });
      
      // Log the exact request structure for debugging
      console.log('Full Instacart recipe request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/idp/v1/products/recipe`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Instacart API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          requestBody: JSON.stringify(requestBody, null, 2)
        });
        
        // Provide more specific error messages
        let errorMessage = `Instacart API error: ${response.status}`;
        if (response.status === 404) {
          errorMessage = 'Instacart API endpoint not found. This may indicate an API configuration issue.';
        } else if (response.status === 401) {
          errorMessage = 'Instacart API authentication failed. Please check your API key.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid request data sent to Instacart API. Please check ingredient formatting.';
        } else if (response.status === 422) {
          errorMessage = 'Instacart could not process the ingredient data. This may be due to poor ingredient matching.';
        } else if (response.status >= 500) {
          errorMessage = 'Instacart API server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Instacart recipe page created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error creating Instacart recipe page:', error);
      throw error;
    }
  }

  async getNearbyRetailers(postalCode: string, countryCode: string = 'US'): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/idp/v1/retailers?postal_code=${postalCode}&country_code=${countryCode}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Instacart retailers API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Instacart retailers API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching nearby retailers:', error);
      throw error;
    }
  }
}

export const instacartService = new InstacartService(); 