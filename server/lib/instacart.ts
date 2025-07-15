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
  link_type: 'recipe';
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
    
    if (!this.apiKey) {
      throw new Error('INSTACART_TEST_KEY environment variable is required');
    }
  }

  private normalizeIngredientName(name: string): string {
    return name.toLowerCase()
      .replace(/^(fresh|dried|frozen|canned|diced|sliced|chopped|minced|ground)\s+/, '')
      .replace(/,.*$/, '')
      .trim();
  }

  private standardizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'g': 'grams',
      'gram': 'grams',
      'grams': 'grams',
      'kg': 'kilograms',
      'oz': 'ounces',
      'ounce': 'ounces',
      'ounces': 'ounces',
      'lb': 'pounds',
      'lbs': 'pounds',
      'pound': 'pounds',
      'pounds': 'pounds',
      'ml': 'milliliters',
      'milliliter': 'milliliters',
      'milliliters': 'milliliters',
      'l': 'liters',
      'liter': 'liters',
      'liters': 'liters',
      'tsp': 'teaspoons',
      'teaspoon': 'teaspoons',
      'teaspoons': 'teaspoons',
      'tbsp': 'tablespoons',
      'tablespoon': 'tablespoons',
      'tablespoons': 'tablespoons',
      'cup': 'cups',
      'cups': 'cups',
      'large': 'large',
      'medium': 'medium',
      'small': 'small',
    };
    return unitMap[unit.toLowerCase()] || unit.toLowerCase();
  }

  private aggregateIngredients(ingredients: Array<{ name: string; amount: number; unit: string }>): InstacartIngredient[] {
    const aggregated: Record<string, { name: string; amount: number; unit: string }> = {};
    
    ingredients.forEach(ingredient => {
      const normalizedName = this.normalizeIngredientName(ingredient.name);
      const standardUnit = this.standardizeUnit(ingredient.unit);
      const key = `${normalizedName}-${standardUnit}`;
      
      if (!aggregated[key]) {
        aggregated[key] = {
          name: ingredient.name,
          amount: ingredient.amount,
          unit: standardUnit
        };
      } else {
        aggregated[key].amount += ingredient.amount;
      }
    });

    return Object.values(aggregated).map(item => ({
      name: item.name,
      display_text: item.name,
      measurements: [{
        quantity: item.amount,
        unit: item.unit
      }]
    }));
  }

  async createShoppingList(
    ingredients: Array<{ name: string; amount: number; unit: string }>,
    title: string = 'My Meal Plan Shopping List'
  ): Promise<InstacartShoppingListResponse> {
    try {
      const aggregatedIngredients = this.aggregateIngredients(ingredients);
      
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
        ingredientCount: aggregatedIngredients.length,
        ingredients: aggregatedIngredients.slice(0, 3) // Log first 3 for debugging
      });

      const response = await fetch(`${this.baseUrl}/idp/v1/products/shopping_list`, {
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
          error: errorText
        });
        throw new Error(`Instacart API error: ${response.status} - ${errorText}`);
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
      const aggregatedIngredients = this.aggregateIngredients(ingredients);
      
      const requestBody: InstacartRecipeRequest = {
        title: recipeName,
        image_url: imageUrl,
        link_type: 'recipe',
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
          error: errorText
        });
        throw new Error(`Instacart API error: ${response.status} - ${errorText}`);
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