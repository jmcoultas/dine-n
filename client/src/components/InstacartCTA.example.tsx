import React from 'react';
import { InstacartCTA } from './InstacartCTA';

/**
 * Example usage of the InstacartCTA component in different contexts
 * This file demonstrates how to integrate the component with your app
 */

// Example 1: Recipe Card Integration
export function RecipeCardExample() {
  const handleInstacartClick = () => {
    // In a real app, you would:
    // 1. Track the click event for analytics
    // 2. Redirect to Instacart with recipe ingredients
    // 3. Pass recipe ID or ingredient list as URL parameters
    
    console.log('Redirecting to Instacart for recipe ingredients...');
    
    // Example redirect (replace with your actual Instacart integration)
    // window.open('https://www.instacart.com/store/recipe-ingredients?recipe_id=123', '_blank');
  };

  return (
    <div className="max-w-sm bg-white rounded-lg shadow-md overflow-hidden">
      <img 
        src="/unsplash.jpg" 
        alt="Recipe" 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Delicious Pasta Recipe</h3>
        <p className="text-gray-600 text-sm mb-4">
          A creamy, flavorful pasta dish that's perfect for weeknight dinners.
        </p>
        <InstacartCTA 
          contentType="recipe" 
          theme="light" 
          onClick={handleInstacartClick}
        />
      </div>
    </div>
  );
}

// Example 2: Grocery List Integration
export function GroceryListExample() {
  const handleInstacartClick = () => {
    console.log('Redirecting to Instacart for grocery items...');
    
    // Example with grocery list items
    // const groceryItems = ['milk', 'eggs', 'bread'];
    // const instacartUrl = `https://www.instacart.com/store/add-items?items=${groceryItems.join(',')}`;
    // window.open(instacartUrl, '_blank');
  };

  return (
    <div className="max-w-md bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Shopping List</h3>
      <ul className="space-y-2 mb-4">
        <li className="flex items-center gap-2">
          <input type="checkbox" className="rounded" />
          <span>Organic milk (1 gallon)</span>
        </li>
        <li className="flex items-center gap-2">
          <input type="checkbox" className="rounded" />
          <span>Free-range eggs (dozen)</span>
        </li>
        <li className="flex items-center gap-2">
          <input type="checkbox" className="rounded" />
          <span>Whole grain bread</span>
        </li>
      </ul>
      <InstacartCTA 
        contentType="grocery" 
        theme="light" 
        onClick={handleInstacartClick}
      />
    </div>
  );
}

// Example 3: Dark Mode Integration
export function DarkModeExample() {
  const handleInstacartClick = () => {
    console.log('Redirecting to Instacart from dark mode interface...');
  };

  return (
    <div className="max-w-sm bg-gray-900 text-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-2">Midnight Snack Recipe</h3>
      <p className="text-gray-300 text-sm mb-4">
        Quick and easy recipe for those late-night cravings.
      </p>
      <InstacartCTA 
        contentType="recipe" 
        theme="dark" 
        onClick={handleInstacartClick}
      />
    </div>
  );
}

// Example 4: Responsive Layout
export function ResponsiveExample() {
  const handleInstacartClick = () => {
    console.log('Instacart CTA clicked from responsive layout');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <RecipeCardExample />
      <GroceryListExample />
      <DarkModeExample />
    </div>
  );
}

// Example 5: With Loading State
export function LoadingStateExample() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleInstacartClick = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call to prepare Instacart data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Redirecting to Instacart...');
      // Actual redirect would happen here
      
    } catch (error) {
      console.error('Failed to prepare Instacart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-sm bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">Recipe with Loading</h3>
      <InstacartCTA 
        contentType="recipe" 
        theme="light" 
        onClick={handleInstacartClick}
        disabled={isLoading}
        className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      />
      {isLoading && (
        <p className="text-sm text-gray-500 mt-2">
          Preparing your ingredients...
        </p>
      )}
    </div>
  );
} 