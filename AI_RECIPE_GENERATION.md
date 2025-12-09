# AI Recipe Generation Feature Specification

## Overview
Allow users to generate custom recipes using AI based on their preferences, dietary restrictions, and specific requirements. This feature provides flexibility beyond meal plans for users who want to create individual recipes.

## User Stories

### Primary Use Cases
1. **As a free user**, I want to generate custom recipes to explore the AI capabilities before subscribing
2. **As a premium user**, I want unlimited recipe generation to build my personal recipe library
3. **As a health-conscious user**, I want to filter by dietary restrictions and nutritional goals
4. **As a busy parent**, I want to specify cooking time constraints and difficulty levels
5. **As a food explorer**, I want to try different cuisines and cooking styles

## Feature Goals

### MVP Requirements
- ✅ AI-powered recipe generation with GPT-4o
- ✅ Image generation with Gemini 2.5 Flash
- ✅ Customizable filters (cuisine, difficulty, time, servings)
- ✅ Dietary restriction support
- ✅ Save to recipe library
- ✅ Usage tracking and limits for free tier
- ✅ Recipe favoriting

### Nice-to-Have Enhancements
- Ingredient exclusion list
- Nutritional information display
- Cooking method preferences (baking, grilling, etc.)
- Recipe regeneration with modifications
- Share recipe externally

## Technical Architecture

### Backend Endpoints

#### Generate Recipe
```
POST /api/generate-recipe
Authorization: Bearer <firebase-token>

Request Body:
{
  "cuisineType": "italian" | "mexican" | "asian" | "american" | "mediterranean" | "indian" | "french" | null,
  "dietaryRestrictions": ["vegetarian", "vegan", "gluten-free", "dairy-free", "nut-free"],
  "cookingTime": "quick" | "medium" | "lengthy" | null,  // <30min | 30-60min | >60min
  "difficultyLevel": "easy" | "medium" | "hard" | null,
  "servings": 2 | 4 | 6 | 8,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | "dessert" | null
}

Response:
{
  "recipe": {
    "id": "rec_123abc",
    "title": "Creamy Tuscan Chicken Pasta",
    "description": "A rich and flavorful Italian-inspired dish...",
    "imageUrl": "https://res.cloudinary.com/...",
    "prepTime": 15,
    "cookTime": 25,
    "totalTime": 40,
    "servings": 4,
    "difficulty": "medium",
    "cuisine": "italian",
    "mealType": "dinner",
    "ingredients": [
      {
        "item": "chicken breast",
        "amount": "1 lb",
        "notes": "cut into bite-sized pieces"
      },
      ...
    ],
    "instructions": [
      {
        "step": 1,
        "instruction": "Heat olive oil in a large skillet..."
      },
      ...
    ],
    "tags": ["pasta", "chicken", "italian", "comfort-food"],
    "nutritionalInfo": {
      "calories": 520,
      "protein": "35g",
      "carbs": "45g",
      "fat": "18g"
    },
    "createdAt": "2025-12-02T10:30:00Z",
    "isFavorite": false
  },
  "usageInfo": {
    "recipesGeneratedThisMonth": 5,
    "recipesRemainingThisMonth": 0,  // unlimited for premium
    "subscriptionTier": "premium"
  }
}

Error Responses:
- 402: Usage limit exceeded (free tier)
- 400: Invalid filter combination
- 500: AI generation failed
```

#### Get User's Generated Recipes
Already implemented: `GET /api/recipes`

#### Save/Favorite Recipe
Already implemented: `POST /api/recipes/{id}/favorite`

### iOS Implementation

#### File Structure
```
Views/
  Recipes/
    RecipeGeneratorView.swift          ← NEW (main generation UI)
    RecipeGenerationResultView.swift   ← NEW (show generated recipe)
    RecipeFilterSheet.swift            ← NEW (filter selection sheet)
    RecipesView.swift                  ← EXISTS (library view)
    RecipeDetailView.swift             ← EXISTS (detail view)
    RecipeCardView.swift               ← EXISTS (card component)

Models/
  Recipe.swift                         ← UPDATE (add generation fields)
  RecipeGenerationRequest.swift       ← NEW (request DTO)

Managers/
  RecipeManager.swift                  ← NEW (handles API calls)
```

#### Key Components

**RecipeGeneratorView.swift**
```swift
// Main recipe generation screen
struct RecipeGeneratorView: View {
    @StateObject private var recipeManager = RecipeManager()
    @State private var showFilters = false
    @State private var isGenerating = false
    @State private var generatedRecipe: Recipe?

    // Filter states
    @State private var selectedCuisine: String?
    @State private var selectedDifficulty: String?
    @State private var selectedCookingTime: String?
    @State private var selectedMealType: String?
    @State private var servings: Int = 4
    @State private var dietaryRestrictions: Set<String> = []

    var body: some View {
        // Filter selection UI
        // "Generate Recipe" button
        // Loading state with progress animation
        // Result navigation
    }
}
```

**RecipeManager.swift**
```swift
class RecipeManager: ObservableObject {
    @Published var isGenerating = false
    @Published var generatedRecipe: Recipe?
    @Published var error: Error?

    func generateRecipe(
        cuisine: String?,
        difficulty: String?,
        cookingTime: String?,
        mealType: String?,
        servings: Int,
        dietaryRestrictions: [String]
    ) async throws -> Recipe {
        // Call POST /api/generate-recipe
        // Handle usage limits
        // Return recipe with image
    }

    func saveToLibrary(_ recipe: Recipe) async throws {
        // Automatically saved by backend
        // Trigger refresh of RecipesView
    }
}
```

## UI/UX Design

### Recipe Generator Screen

**Layout:**
```
┌─────────────────────────────────┐
│ < Back    Generate Recipe       │
├─────────────────────────────────┤
│                                 │
│  🍳 What would you like to cook?│
│                                 │
│  ┌───────────────────────────┐ │
│  │ Cuisine Type              │ │
│  │ Any ▼                     │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Meal Type                 │ │
│  │ Dinner ▼                  │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Cooking Time              │ │
│  │ 30-60 minutes ▼           │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Difficulty                │ │
│  │ Medium ▼                  │ │
│  └───────────────────────────┘ │
│                                 │
│  Servings:  [ - ]  4  [ + ]    │
│                                 │
│  Dietary Restrictions:          │
│  [✓] Vegetarian  [ ] Vegan     │
│  [ ] Gluten-Free [ ] Dairy-Free│
│                                 │
│  ┌───────────────────────────┐ │
│  │   🪄 Generate Recipe      │ │
│  └───────────────────────────┘ │
│                                 │
│  💡 You have unlimited recipe   │
│     generation (Premium)        │
│                                 │
└─────────────────────────────────┘
```

### Loading State
```
┌─────────────────────────────────┐
│        Generating Recipe        │
├─────────────────────────────────┤
│                                 │
│        🪄                        │
│                                 │
│   Creating your recipe...       │
│                                 │
│   [████████░░░░░░░░] 60%       │
│                                 │
│   • Selecting ingredients       │
│   • Writing instructions        │
│   • Generating image...         │
│                                 │
└─────────────────────────────────┘
```

### Result View
After generation, show the recipe in RecipeDetailView with:
- "Save to Library" button (if not auto-saved)
- "Generate Another" button
- "Share Recipe" button
- Full recipe details (ingredients, instructions, image)

## User Flow

### Generation Flow
1. User taps "Generate Recipe" from Recipes tab
2. RecipeGeneratorView appears with filter options
3. User selects preferences (optional - can use defaults)
4. User taps "Generate Recipe" button
5. Loading screen shows with progress
6. On success:
   - Navigate to RecipeDetailView
   - Recipe auto-saved to library
   - Show success message
7. On error:
   - Show error alert
   - If usage limit: Show upgrade prompt
   - If network error: Show retry option

### Filter Selection Flow
1. Each filter has a dropdown/picker
2. Default state: "Any" for optional filters
3. Servings: Stepper (2, 4, 6, 8)
4. Dietary restrictions: Multi-select checkboxes
5. Filters are persistent across sessions (UserDefaults)

## Usage Limits & Monetization

### Free Tier
- **Limit**: 3 recipe generations per month
- **Reset**: Monthly on subscription anniversary
- **Behavior**: Show paywall after limit reached
- **Messaging**: "You've used all 3 free recipes. Upgrade for unlimited!"

### Premium Tier
- **Limit**: Unlimited
- **Perks**: Faster generation, priority queue
- **Messaging**: "✨ Unlimited recipe generation (Premium)"

## Error Handling

### Error States
1. **Usage Limit Exceeded**
   - Show upgrade prompt with Stripe checkout
   - Display count: "You've generated X/3 recipes this month"

2. **AI Generation Failed**
   - Show retry button
   - Log error to backend
   - Fallback message: "Our AI chef is taking a break. Please try again."

3. **Network Error**
   - Show offline message
   - Cache last successful request for retry
   - Auto-retry on reconnection

4. **Invalid Filters**
   - Validate before sending request
   - Show inline error messages

## Testing Requirements

### Unit Tests
- RecipeManager API call formatting
- Usage limit calculations
- Filter validation logic

### Integration Tests
- Full generation flow (mock API)
- Error handling for all error types
- Usage limit enforcement

### Manual Testing
- Generate recipe with all filter combinations
- Test free tier limit (create test user with 2/3 used)
- Test premium unlimited access
- Test offline behavior
- Test image loading failures
- Verify recipe saves to library
- Test favoriting generated recipes

## Success Metrics

### KPIs
- Recipes generated per user per month
- Conversion rate (free → premium) from usage limit
- Average filters used per generation
- Recipe save rate (generated → library)
- Recipe favorite rate

### Analytics Events
```
recipeGeneration.started {
  userId, cuisine, difficulty, cookingTime, mealType, servings, dietaryRestrictions
}

recipeGeneration.completed {
  userId, recipeId, generationTime, filters
}

recipeGeneration.failed {
  userId, errorType, filters
}

recipeGeneration.limitReached {
  userId, currentCount, tier
}

recipeGeneration.saved {
  userId, recipeId
}
```

## Implementation Phases

### Phase 1: Core Generation (2-3 days)
1. Create RecipeManager with API integration
2. Build RecipeGeneratorView with basic filters
3. Implement loading state
4. Show generated recipe in RecipeDetailView
5. Test with backend

### Phase 2: Enhanced Filters (1-2 days)
1. Add all filter options (cuisine, time, difficulty, servings)
2. Add dietary restrictions multi-select
3. Persist filter preferences
4. Add filter validation

### Phase 3: Usage Limits & Polish (1 day)
1. Implement usage limit checks
2. Add upgrade prompts for free users
3. Add usage counter display
4. Error handling and edge cases

### Phase 4: Testing & Refinement (1 day)
1. Manual testing of all flows
2. Test free vs premium behavior
3. Test error states
4. Performance optimization

## Dependencies

### Backend
- ✅ POST /api/generate-recipe endpoint
- ✅ Usage tracking in user model
- ✅ GPT-4o integration
- ✅ Gemini image generation
- ✅ Cloudinary storage

### iOS
- ✅ RecipesView (for library integration)
- ✅ RecipeDetailView (for displaying result)
- ✅ AuthManager (for usage limits)
- ✅ Recipe model (may need extension)

## Open Questions

1. Should we allow saving recipes before they're generated (bookmark filter combos)?
2. Do we want recipe regeneration ("try again with same filters")?
3. Should we show nutritional info prominently or hide it?
4. Do we need a recipe history separate from favorites?
5. Should premium users get priority in the generation queue?

## Notes

- Recipe generation uses the same AI pipeline as meal plans
- Images are generated with Gemini 2.5 Flash and stored in Cloudinary
- Recipes are automatically saved to the user's library upon generation
- Usage limits are tracked server-side to prevent client-side bypassing
- Consider adding recipe rating/feedback for AI improvement
