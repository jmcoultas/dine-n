// Simple test to verify Instacart API integration
const INSTACART_TEST_KEY = process.env.INSTACART_TEST_KEY || 'your-test-key-here';
const BASE_URL = 'https://connect.dev.instacart.tools';

async function testInstacartShoppingList() {
  console.log('Testing Instacart shopping list creation...');
  
  const testIngredients = [
    {
      name: "whole milk",
      display_text: "Whole milk",
      measurements: [
        {
          quantity: 1,
          unit: "cup"
        }
      ]
    },
    {
      name: "eggs",
      display_text: "Eggs",
      measurements: [
        {
          quantity: 2,
          unit: "large"
        }
      ]
    },
    {
      name: "flour",
      display_text: "All-purpose flour",
      measurements: [
        {
          quantity: 2,
          unit: "cups"
        }
      ]
    }
  ];

  const requestBody = {
    title: "Test Shopping List",
    line_items: testIngredients,
    landing_page_configuration: {
      partner_linkback_url: "https://dinen.ai/meal-plan",
      enable_pantry_items: true
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/idp/v1/products/shopping_list`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_TEST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('Success! Shopping list created:', result);
    console.log('Shopping list URL:', result.products_link_url);
  } catch (error) {
    console.error('Error testing Instacart API:', error);
  }
}

async function testInstacartRecipe() {
  console.log('Testing Instacart recipe page creation...');
  
  const testIngredients = [
    {
      name: "whole milk",
      display_text: "Whole milk",
      measurements: [
        {
          quantity: 0.5,
          unit: "cup"
        }
      ]
    },
    {
      name: "eggs",
      display_text: "Eggs",
      measurements: [
        {
          quantity: 1,
          unit: "large"
        }
      ]
    },
    {
      name: "flour",
      display_text: "All-purpose flour",
      measurements: [
        {
          quantity: 1,
          unit: "cup"
        }
      ]
    }
  ];

  const requestBody = {
    title: "Test Pancake Recipe",
    link_type: "recipe",
    instructions: [
      "Mix dry ingredients in a bowl",
      "Whisk wet ingredients separately",
      "Combine wet and dry ingredients",
      "Cook on griddle until golden brown"
    ],
    ingredients: testIngredients,
    landing_page_configuration: {
      partner_linkback_url: "https://dinen.ai/meal-plan",
      enable_pantry_items: true
    }
  };

  try {
    const response = await fetch(`${BASE_URL}/idp/v1/products/recipe`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${INSTACART_TEST_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('Success! Recipe page created:', result);
    console.log('Recipe page URL:', result.products_link_url);
  } catch (error) {
    console.error('Error testing Instacart API:', error);
  }
}

// Run tests
async function runTests() {
  if (!INSTACART_TEST_KEY || INSTACART_TEST_KEY === 'your-test-key-here') {
    console.error('Please set INSTACART_TEST_KEY environment variable');
    return;
  }

  console.log('Using API key:', INSTACART_TEST_KEY.substring(0, 10) + '...');
  console.log('Using base URL:', BASE_URL);
  console.log('---');

  await testInstacartShoppingList();
  console.log('---');
  await testInstacartRecipe();
}

runTests(); 