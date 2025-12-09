# PantryPal Feature Specification
## "What Can I Cook?" - Recipe Generation from Available Ingredients

## Overview
PantryPal helps users discover recipes based on ingredients they already have, reducing food waste and maximizing pantry usage. This premium feature integrates with the pantry inventory to suggest recipes that match available ingredients.

## User Stories

### Primary Use Cases
1. **As a busy parent**, I want to know what I can cook with what's in my fridge without going shopping
2. **As a budget-conscious user**, I want to use up ingredients before they expire
3. **As a sustainable cook**, I want to reduce food waste by using what I have
4. **As a spontaneous chef**, I want recipe inspiration from my current inventory
5. **As a meal prepper**, I want to see which recipes I can make now vs. what I need to buy

## Feature Goals

### MVP Requirements
- ✅ Input ingredients manually (text list)
- ✅ AI-powered recipe matching from available ingredients
- ✅ Display match percentage (how many ingredients user has)
- ✅ Highlight missing ingredients
- ✅ Generate recipes with partial ingredient matches
- ✅ Premium feature - require subscription check
- ✅ Save generated recipes to library

### Enhanced Features (v2)
- 🔄 Auto-populate from pantry inventory (when Phase 4 complete)
- Suggest ingredients to buy to unlock more recipes
- Filter by "I can make right now" vs "Missing 1-2 items"
- Shopping list for missing ingredients
- Expiration date awareness (prioritize ingredients expiring soon)

## Technical Architecture

### Backend Endpoints

#### Generate Recipes from Ingredients
```
POST /api/ingredients-to-recipes
Authorization: Bearer <firebase-token>
X-Subscription-Check: Required (Premium only)

Request Body:
{
  "ingredients": [
    "chicken breast",
    "rice",
    "bell peppers",
    "onion",
    "garlic",
    "soy sauce"
  ],
  "numberOfRecipes": 3,  // How many recipe suggestions
  "preferences": {
    "cuisine": "asian" | null,
    "difficulty": "easy" | "medium" | "hard" | null,
    "cookingTime": "quick" | "medium" | "lengthy" | null,
    "dietaryRestrictions": ["vegetarian", "gluten-free"]
  }
}

Response:
{
  "recipes": [
    {
      "id": "rec_abc123",
      "title": "Asian Chicken Stir Fry",
      "description": "Quick and flavorful stir fry with vegetables",
      "imageUrl": "https://res.cloudinary.com/...",
      "prepTime": 10,
      "cookTime": 15,
      "totalTime": 25,
      "servings": 4,
      "difficulty": "easy",
      "cuisine": "asian",
      "ingredients": [
        {
          "item": "chicken breast",
          "amount": "1 lb",
          "notes": "sliced thin",
          "userHas": true  // ← Indicates if user provided this
        },
        {
          "item": "rice",
          "amount": "2 cups",
          "notes": "cooked",
          "userHas": true
        },
        {
          "item": "bell peppers",
          "amount": "2",
          "notes": "sliced",
          "userHas": true
        },
        {
          "item": "sesame oil",
          "amount": "1 tbsp",
          "notes": "",
          "userHas": false  // ← Missing ingredient
        }
      ],
      "instructions": [...],
      "matchScore": 85,  // Percentage of ingredients user has
      "missingIngredients": ["sesame oil"],
      "tags": ["quick", "asian", "stir-fry"],
      "isFavorite": false
    },
    ...
  ],
  "summary": {
    "totalRecipes": 3,
    "ingredientsProvided": 6,
    "averageMatchScore": 82
  }
}

Error Responses:
- 403: Not a premium subscriber
- 400: No ingredients provided
- 400: Too many ingredients (limit 20)
- 500: AI generation failed
```

#### Future: Get Pantry Inventory (Phase 4)
```
GET /api/pantry/items
Response: Array of pantry items with quantities
```

### iOS Implementation

#### File Structure
```
Views/
  Pantry/
    PantryPalView.swift                    ← NEW (main feature screen)
    IngredientInputView.swift              ← NEW (manual ingredient entry)
    RecipeMatchCard.swift                  ← NEW (recipe card with match %)
    PantryRecipeDetailView.swift           ← NEW (detail with missing ingredients)

Models/
  PantryPalRequest.swift                   ← NEW (request DTO)
  PantryPalRecipe.swift                    ← NEW (recipe with match data)

Managers/
  PantryPalManager.swift                   ← NEW (API integration)
```

#### Key Components

**PantryPalView.swift**
```swift
struct PantryPalView: View {
    @StateObject private var pantryPalManager = PantryPalManager()
    @EnvironmentObject var authManager: AuthManager

    @State private var ingredients: [String] = []
    @State private var currentIngredient = ""
    @State private var isGenerating = false
    @State private var showResults = false
    @State private var recipes: [PantryPalRecipe] = []

    // Preferences
    @State private var selectedCuisine: String?
    @State private var selectedDifficulty: String?
    @State private var numberOfRecipes = 3

    var body: some View {
        NavigationView {
            // Premium check
            if !authManager.user?.isPremium {
                SubscriptionPaywall(feature: "PantryPal")
            } else {
                // Ingredient input UI
                // Recipe results list
            }
        }
    }
}
```

**IngredientInputView.swift**
```swift
struct IngredientInputView: View {
    @Binding var ingredients: [String]
    @State private var inputText = ""

    var body: some View {
        VStack {
            // Text field for adding ingredients
            // List of added ingredients with delete
            // Quick add suggestions (common ingredients)
        }
    }
}
```

**RecipeMatchCard.swift**
```swift
struct RecipeMatchCard: View {
    let recipe: PantryPalRecipe

    var body: some View {
        VStack {
            // Recipe image
            // Match percentage badge (85% match)
            // Recipe title
            // Missing ingredients count
            // "X ingredients you have" indicator
        }
    }
}
```

**PantryPalManager.swift**
```swift
class PantryPalManager: ObservableObject {
    @Published var isGenerating = false
    @Published var recipes: [PantryPalRecipe] = []
    @Published var error: Error?

    func generateRecipes(
        ingredients: [String],
        numberOfRecipes: Int,
        cuisine: String?,
        difficulty: String?,
        cookingTime: String?
    ) async throws -> [PantryPalRecipe] {
        // Call POST /api/ingredients-to-recipes
        // Handle premium check
        // Return matched recipes
    }

    func loadFromPantryInventory() async throws -> [String] {
        // Future: Load from GET /api/pantry/items
        // For now: Manual entry only
    }
}
```

## UI/UX Design

### Main Screen - Ingredient Input

```
┌─────────────────────────────────┐
│ < Back      PantryPal      🛒   │
├─────────────────────────────────┤
│                                 │
│  🔍 What's in your kitchen?     │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Add ingredient... [Add] │   │
│  └─────────────────────────┘   │
│                                 │
│  Your Ingredients (6):          │
│  ┌─────────────────────────┐   │
│  │ 🍗 Chicken breast    [×]│   │
│  │ 🍚 Rice              [×]│   │
│  │ 🫑 Bell peppers      [×]│   │
│  │ 🧅 Onion             [×]│   │
│  │ 🧄 Garlic            [×]│   │
│  │ 🥫 Soy sauce         [×]│   │
│  └─────────────────────────┘   │
│                                 │
│  Quick Add:                     │
│  [Eggs] [Milk] [Tomatoes]      │
│  [Pasta] [Cheese] [Butter]     │
│                                 │
│  Preferences:                   │
│  Cuisine: Any ▼  Difficulty: Any▼│
│  Number of recipes: [3]         │
│                                 │
│  ┌───────────────────────────┐ │
│  │  🪄 Find Recipes (3)      │ │
│  └───────────────────────────┘ │
│                                 │
│  💡 PantryPal uses AI to find   │
│     recipes you can make now!   │
│                                 │
└─────────────────────────────────┘
```

### Results Screen

```
┌─────────────────────────────────┐
│ < Back      Recipe Ideas        │
├─────────────────────────────────┤
│                                 │
│  Found 3 recipes for you! 🎉    │
│                                 │
│  ┌───────────────────────────┐ │
│  │ [Recipe Image]            │ │
│  │                     92%   │ │
│  │ Asian Chicken Stir Fry    │ │
│  │ ⏱ 25 min  👨‍🍳 Easy        │ │
│  │                           │ │
│  │ ✅ 11/12 ingredients      │ │
│  │ Missing: sesame oil       │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ [Recipe Image]            │ │
│  │                     85%   │ │
│  │ Chicken Fried Rice        │ │
│  │ ⏱ 20 min  👨‍🍳 Easy        │ │
│  │                           │ │
│  │ ✅ 10/12 ingredients      │ │
│  │ Missing: eggs, green onion│ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ [Recipe Image]            │ │
│  │                     78%   │ │
│  │ Pepper Chicken            │ │
│  │ ⏱ 30 min  👨‍🍳 Medium      │ │
│  │                           │ │
│  │ ✅ 8/10 ingredients       │ │
│  │ Missing: black pepper...  │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### Recipe Detail View (Enhanced)

Same as standard RecipeDetailView, but with:
- **Match percentage** badge at top
- **Ingredients you have** highlighted in green
- **Missing ingredients** highlighted in orange with shopping cart icon
- "Add missing items to shopping list" button (future)
- Standard save/favorite functionality

## User Flow

### Discovery Flow
1. User navigates to "PantryPal" from main tab or Pantry section
2. System checks premium status
   - If not premium: Show subscription paywall
   - If premium: Show ingredient input screen
3. User adds ingredients manually:
   - Type ingredient name → tap "Add"
   - Use "Quick Add" buttons for common items
   - Remove ingredients with [×] button
4. User optionally sets preferences (cuisine, difficulty, # of recipes)
5. User taps "Find Recipes"
6. Loading screen shows "Finding recipes..."
7. Results screen shows matched recipes sorted by match %
8. User taps recipe to see full details
9. User can save recipe to library or favorite it

### Future: Pantry Integration Flow (Phase 4)
1. User taps "Load from My Pantry"
2. System fetches pantry inventory from backend
3. All pantry items auto-populate ingredient list
4. User can add/remove items before searching
5. Continue with standard flow

## Premium Gating

### Paywall Design
```
┌─────────────────────────────────┐
│         PantryPal 🔒            │
├─────────────────────────────────┤
│                                 │
│         [Chef hat icon]         │
│                                 │
│   Unlock Smart Recipe Matching  │
│                                 │
│   ✨ Find recipes from your     │
│      ingredients                │
│   ✨ Reduce food waste          │
│   ✨ Save money on groceries    │
│   ✨ AI-powered matching        │
│   ✨ Unlimited searches         │
│                                 │
│   PantryPal is a Premium feature│
│                                 │
│  ┌───────────────────────────┐ │
│  │  Upgrade to Premium       │ │
│  │  $4.99/month              │ │
│  └───────────────────────────┘ │
│                                 │
│        [Maybe Later]            │
│                                 │
└─────────────────────────────────┘
```

### Premium Check Logic
```swift
// In PantryPalView
var body: some View {
    if authManager.user?.subscriptionTier != "premium" {
        PantryPalPaywall()
            .environmentObject(authManager)
    } else {
        // Main PantryPal interface
    }
}
```

## Ingredient Matching Logic

### Backend AI Prompt Strategy
```
System: You are a creative chef who excels at creating recipes
from available ingredients. The user has these ingredients:
[list]. Generate {numberOfRecipes} recipes that:

1. Use as many of the provided ingredients as possible
2. Minimize additional ingredients needed
3. Are realistic and practical
4. Match the requested preferences: {preferences}

For each recipe:
- Mark which ingredients the user has vs. needs to buy
- Calculate a match percentage
- Ensure the recipe is complete and detailed
```

### Match Score Calculation
```
matchScore = (ingredientsUserHas / totalIngredientsInRecipe) * 100

Example:
Recipe has 12 ingredients
User has 11 of them
Match = (11/12) * 100 = 92%
```

### Sorting Priority
1. Match percentage (highest first)
2. Fewest missing ingredients
3. Recipe difficulty (easiest first)
4. Cooking time (shortest first)

## Error Handling

### Error States
1. **Not Premium Subscriber**
   - Show paywall immediately
   - Clear call-to-action to upgrade

2. **No Ingredients Entered**
   - Disable "Find Recipes" button
   - Show prompt: "Add at least 3 ingredients to get started"

3. **Too Many Ingredients (>20)**
   - Show alert: "Please limit to 20 ingredients for best results"
   - Suggest most common/versatile ingredients

4. **No Recipes Found**
   - Show message: "We couldn't find recipes matching your ingredients"
   - Suggest: "Try adding more common ingredients like salt, oil, or eggs"

5. **AI Generation Failed**
   - Show retry button
   - Fallback: "Our chef is taking a break. Please try again."

6. **Network Error**
   - Show offline message
   - Cache ingredient list for retry

## Usage Tracking & Analytics

### Events to Track
```
pantryPal.opened {
  userId, isPremium
}

pantryPal.paywallShown {
  userId
}

pantryPal.ingredientsAdded {
  userId, ingredientCount, ingredients
}

pantryPal.searchStarted {
  userId, ingredientCount, numberOfRecipes, preferences
}

pantryPal.searchCompleted {
  userId, recipesFound, averageMatchScore, generationTime
}

pantryPal.recipeViewed {
  userId, recipeId, matchScore, missingIngredientsCount
}

pantryPal.recipeSaved {
  userId, recipeId, matchScore
}
```

### KPIs
- Feature usage rate (% of premium users)
- Average ingredients per search
- Average match scores
- Conversion rate (paywall → subscription)
- Recipe save rate from PantryPal
- Time saved vs. manual recipe browsing

## Testing Requirements

### Unit Tests
- Premium status check
- Ingredient list management (add/remove)
- Match score calculation
- Sorting logic

### Integration Tests
- Full flow: Add ingredients → Generate → View results
- Premium paywall display for free users
- Error handling for all error types
- Recipe saving from results

### Manual Testing
- Test with 3, 10, and 20 ingredients
- Test with common vs. exotic ingredients
- Test premium vs. free user experience
- Test with various preference combinations
- Verify match percentage accuracy
- Test missing ingredient highlighting
- Test recipe save functionality

## Implementation Phases

### Phase 1: Core Feature (2-3 days)
1. Create PantryPalManager with API integration
2. Build IngredientInputView for manual entry
3. Implement recipe generation and results display
4. Add premium gating with paywall
5. Test basic flow

### Phase 2: Enhanced UI (1-2 days)
1. Build RecipeMatchCard with match percentage
2. Add ingredient highlighting in detail view
3. Add "Quick Add" common ingredients
4. Add preference filters
5. Polish loading states

### Phase 3: Integration & Testing (1 day)
1. Integrate with existing RecipeDetailView
2. Add recipe saving functionality
3. Implement error handling
4. Manual testing of all flows
5. Premium paywall testing

### Phase 4: Future Enhancements (Phase 4 dependency)
1. Auto-load from pantry inventory
2. Expiration date awareness
3. Shopping list for missing ingredients
4. "I can make now" vs "Missing 1-2" filter

## Dependencies

### Backend
- ✅ POST /api/ingredients-to-recipes endpoint
- ✅ Subscription tier check middleware
- ✅ GPT-4o integration
- ✅ Gemini image generation
- 🔄 GET /api/pantry/items (Phase 4 - for auto-load)

### iOS
- ✅ AuthManager (for premium check)
- ✅ RecipeDetailView (for displaying results)
- ✅ SubscriptionView (for paywall)
- 🔄 PantryInventory (Phase 4 - for auto-load)

## Open Questions

1. Should we allow saving ingredient lists for repeated use?
2. Should we suggest "add these 2 ingredients to unlock 5 more recipes"?
3. Do we need a history of past searches?
4. Should we prioritize ingredients close to expiration (Phase 4)?
5. Should free users get 1 PantryPal search per month as a teaser?

## Success Criteria

### Launch Criteria
- ✅ Premium users can input ingredients manually
- ✅ System generates 3+ recipe matches
- ✅ Match percentages are accurate
- ✅ Missing ingredients are clearly highlighted
- ✅ Recipes can be saved to library
- ✅ Free users see paywall

### Quality Criteria
- Match scores are intuitive and accurate
- Results feel relevant to ingredients provided
- UI is intuitive and easy to use
- Premium paywall converts users
- Feature drives premium subscriptions

## Notes

- PantryPal is a key premium differentiator
- This feature directly reduces food waste (strong marketing angle)
- Consider partnering with grocery delivery services (future)
- Match percentage should be conservative (better to under-promise)
- Common pantry staples (salt, oil, water) shouldn't heavily affect match %
