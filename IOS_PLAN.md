🚀 Phase 1: Core User Experience (Week 1) ✅ COMPLETED

  Goal: Complete the onboarding → first meal plan flow

  1.1 Enhanced Onboarding & Registration ✅

  Backend Endpoints:
  - ✅ POST /api/auth/firebase-token (already working)
  - ✅ PUT /api/user/profile (already working)

  Tasks:
  1. ✅ Update AuthManager.signUp() to automatically call authenticateWithBackend() after Firebase registration
  2. ✅ After successful registration, guide user to PreferencesView to set dietary preferences
  3. ✅ On preferences save, clear is_partial_registration flag via backend
  4. ✅ Show welcome screen explaining free tier (1 free meal plan)

  Files modified:
  - ✅ App/AuthManager.swift - Added post-signup backend auth
  - ✅ App/AuthenticationView.swift - Added onboarding flow navigation
  - ✅ App/ViewsPreferencesView.swift - Added "Complete Onboarding" messaging

  1.2 User Profile Enhancement ✅

  Backend Endpoints:
  - ✅ GET /api/user (already working)

  Tasks:
  1. ✅ Add pull-to-refresh to reload user data from backend
  2. ✅ Display accurate usage statistics (meal plans generated, pantry uses)
  3. ✅ Show subscription status with clear messaging
  4. ✅ Add "Upgrade to Premium" button for free users

  Files modified:
  - ✅ Views/Profile/ProfileView.swift - Enhanced UI with live data
  - ✅ App/AuthManager.swift - Added refreshBackendUser() calls

  1.3 Subscription Flow Completion ✅

  Backend Endpoints:
  - ✅ GET /api/subscription/status
  - ✅ POST /api/subscription/create-checkout
  - ✅ POST /api/subscription/cancel

  Tasks:
  1. ✅ Integrate Stripe checkout URL opening in Safari/in-app browser
  2. ✅ Handle return URL from Stripe checkout to refresh user data
  3. ✅ Add subscription cancellation confirmation dialog
  4. ✅ Display subscription renewal date and billing info

  Files modified:
  - ✅ App/ViewsSubscriptionView.swift - Completed Stripe integration
  - ✅ App/AuthManager.swift - Added webhook callback handling

  Estimated Time: 3-4 days
  Actual Time: ~3 days

  ---
  🚀 Phase 2: Meal Planning Core Features (Week 2) ✅ COMPLETED + ENHANCED

  Goal: Users can generate and view meal plans

  2.1 Meal Plan Generation UI ✅

  Backend Endpoints:
  - ✅ POST /api/generate-meal-plan
  - ✅ GET /api/meal-plans/current

  Tasks:
  1. ✅ Build out ViewsMealPlanGeneratorView.swift with preference filters
  2. ✅ Add dietary preference selection (uses user's saved preferences as defaults)
  3. ✅ Add "Generate Plan" button that calls MealPlanManager.generateMealPlan()
  4. ✅ Show loading state with AI generation progress
  5. ✅ On success, navigate to meal plan view
  6. ✅ Handle usage limits for free users (max 1 plan)

  Files modified:
  - ✅ App/ViewsMealPlanGeneratorView.swift - Built full generation UI
  - ✅ App/ManagersMealPlanManager.swift - Added error handling for limits
  - ✅ Views/MainTabView.swift - Updated planner tab navigation

  2.2 Meal Plan Display ✅

  Backend Endpoints:
  - ✅ GET /api/meal-plans/current
  - ✅ GET /api/meal-plans

  Tasks:
  1. ✅ Create MealPlanDetailView.swift to display weekly meal plan
  2. ✅ Show meals organized by meal type (Breakfast, Lunch, Dinner) - CHANGED FROM DAY-BASED
  3. ✅ Display recipe cards with images, prep time, difficulty, cuisine
  4. ✅ Add navigation to recipe detail view
  5. ⏸️ Show grocery list generated with plan (Deferred to Phase 3)
  6. ✅ Add "Generate New Plan" button (with limits check)

  Files created:
  - ✅ Views/MealPlanner/MealPlanDetailView.swift
  - ✅ App/ModelsMealPlan.swift - Data models with DTO transformation

  2.3 🆕 Tasting Menu Feature (ADDED) ✅

  Backend Endpoints:
  - ✅ POST /api/generate-meal-plan-preview - NEW
  - ✅ POST /api/generate-meal-plan-from-preview - NEW

  Features:
  - ✅ Swipe-based recipe selection (Tinder-style UX)
  - ✅ Preview generation with title + description (21 cards in ~30 sec)
  - ✅ User selects which recipes to generate (cost savings 50-80%)
  - ✅ Summary view to review selections before generating
  - ✅ Full meal plan generation from selections with images
  - ✅ Progress tracking (X/21 reviewed, Y selected)
  - ✅ Undo functionality with history tracking
  - ✅ Accept/Reject swipe indicators

  Files created:
  - ✅ App/ModelsTastingMenu.swift - Preview models with mock data
  - ✅ Views/MealPlanner/TastingMenuView.swift - Swipe interface
  - ✅ Views/Components/RecipePreviewCard.swift - Preview card component
  - ✅ Documents/TASTING_MENU_FEATURE.md - Full feature specification

  Backend changes:
  - ✅ In-memory preview cache (30-min TTL)
  - ✅ Preference persistence across preview → full generation
  - ✅ Round-robin cuisine rotation
  - ✅ Gemini 2.5 Flash image generation
  - ✅ Cloudinary image storage

  Design updates:
  - ✅ Centered card layout optimized for text (no image needed)
  - ✅ Large cuisine flag emoji (80pt) as visual focal point
  - ✅ Unified orange/tan gradient background (matches login)
  - ✅ Meal type color badges (breakfast/lunch/dinner)

  2.4 Weekly Planner Suggestions ⏸️ DEFERRED

  Backend Endpoints:
  - ✅ POST /api/weekly-planner/suggestions
  - ✅ POST /api/weekly-planner/create-plan

  Status: Backend ready, iOS implementation deferred (Tasting Menu provides similar functionality)

  Estimated Time: 5-6 days
  Actual Time: ~8 days (including Tasting Menu enhancement)

  ---
  🚀 Phase 3: Recipe Features (Week 3) 🔄 IN PROGRESS

  Goal: Users can browse, generate, and save recipes

  3.1 Recipe Library ✅ COMPLETED

  Backend Endpoints:
  - ✅ GET /api/recipes
  - ✅ POST /api/recipes/{id}/favorite

  Tasks:
  1. ✅ Build RecipesView.swift to display saved recipes
  2. ✅ Add grid/list view toggle
  3. ✅ Implement favorite filtering
  4. ✅ Add search/filter by cuisine, difficulty, cooking time
  5. ✅ Create recipe detail view with full instructions

  Files created/modified:
  - ✅ Views/Recipes/RecipesView.swift
  - ✅ Views/Recipes/RecipeDetailView.swift
  - ✅ Views/Recipes/RecipeCardView.swift

  3.2 AI Recipe Generation

  Backend Endpoints:
  - ✅ POST /api/generate-recipe

  Tasks:
  1. Create recipe generation form with filters:
    - Cuisine type
    - Dietary restrictions
    - Cooking time preference
    - Difficulty level
    - Number of servings
  2. Show AI-generated recipes
  3. Allow saving to recipe library
  4. Track usage for free tier limits

  New files to create:
  - Views/Recipes/RecipeGeneratorView.swift

  3.3 PantryPal (Recipes from Ingredients)

  Backend Endpoints:
  - ✅ POST /api/ingredients-to-recipes

  Tasks:
  1. Create ingredient input UI (text list or selection)
  2. Call backend to generate recipes from available ingredients
  3. Display recipe suggestions with ingredient matching
  4. Highlight which pantry items are used
  5. Premium feature - enforce subscription check

  New files to create:
  - Views/Pantry/PantryPalView.swift

  Estimated Time: 5-6 days

  ---
  🚀 Phase 4: Pantry Management (Week 4)

  Goal: Users can track inventory and get smart suggestions

  4.1 Pantry Inventory

  Backend Endpoints:
  - Need to implement on backend (not yet documented)
  - GET /api/pantry/items
  - POST /api/pantry/items
  - PUT /api/pantry/items/{id}
  - DELETE /api/pantry/items/{id}

  Tasks:
  1. Build pantry item list view
  2. Add/edit/delete pantry items
  3. Categorize items (produce, dairy, grains, etc.)
  4. Track expiration dates
  5. Show low stock warnings

  New files to create:
  - Views/Pantry/PantryView.swift
  - Views/Pantry/PantryItemRow.swift
  - Views/Pantry/AddPantryItemView.swift

  4.2 Pantry Analytics (Premium)

  Tasks:
  1. Usage tracking visualization
  2. Waste reduction insights
  3. Shopping suggestions based on patterns
  4. Expiration alerts

  New files to create:
  - Views/Pantry/PantryAnalyticsView.swift

  Estimated Time: 4-5 days

  ---
  🚀 Phase 5: Polish & Production Readiness (Week 5)

  Goal: Production-ready app with error handling and edge cases

  5.1 Error Handling & Edge Cases

  Tasks:
  1. Offline mode handling (cache last data)
  2. Network error retry logic
  3. Token expiration handling (auto-refresh)
  4. Usage limit exceeded messaging
  5. Empty states for all views
  6. Loading states with proper UI feedback

  5.2 Usage Limit Enforcement

  Tasks:
  1. Pre-flight checks before expensive operations
  2. Clear messaging when limits reached
  3. Upgrade prompts at limit boundaries
  4. Usage progress indicators

  5.3 Image Loading & Caching

  Tasks:
  1. Implement AsyncImage with fallbacks
  2. Cache recipe images
  3. Handle missing/broken image URLs

  5.4 Testing & QA

  Tasks:
  1. Test full onboarding flow
  2. Test free tier limits (1 meal plan)
  3. Test premium tier features
  4. Test subscription upgrade/cancel flow
  5. Test all API endpoints with production backend

  Estimated Time: 4-5 days

  ---
  📋 Implementation Priority Matrix

  | Feature               | Priority    | Complexity | User Impact | Backend Ready  | Status      |
  |-----------------------|-------------|------------|-------------|----------------|-------------|
  | Onboarding completion | 🔴 Critical | Low        | High        | ✅ Yes          | ✅ DONE     |
  | User profile refresh  | 🔴 Critical | Low        | Medium      | ✅ Yes          | ✅ DONE     |
  | Subscription checkout | 🔴 Critical | Medium     | High        | ✅ Yes          | ✅ DONE     |
  | Meal plan generation  | 🔴 Critical | Medium     | High        | ✅ Yes          | ✅ DONE     |
  | Meal plan display     | 🔴 Critical | Medium     | High        | ✅ Yes          | ✅ DONE     |
  | Tasting Menu (NEW!)   | 🔴 Critical | High       | High        | ✅ Yes          | ✅ DONE     |
  | Recipe library        | 🟡 High     | Medium     | High        | ✅ Yes          | ✅ DONE     |
  | AI recipe generation  | 🟡 High     | Low        | Medium      | ✅ Yes          | ⏸️ TODO     |
  | PantryPal             | 🟡 High     | Medium     | Medium      | ✅ Yes          | ⏸️ TODO     |
  | Weekly planner        | 🟢 Medium   | High       | Medium      | ✅ Yes          | ⏸️ DEFERRED |
  | Pantry management     | 🟢 Medium   | High       | Medium      | ❌ Need backend | ⏸️ TODO     |
  | Pantry analytics      | 🔵 Low      | High       | Low         | ❌ Need backend | ⏸️ TODO     |

  ---
  📍 CURRENT STATUS (December 2, 2025)

  **Completed Phases**: Phase 1 (✅), Phase 2 (✅)
  **Current Phase**: Phase 3 - Recipe Features (In Progress)
  **Completed in Phase 3**: Recipe Library (✅)
  **Next Up**: AI Recipe Generation & PantryPal

  🎉 **Major Milestone Achieved**: Tasting Menu Feature
  - Revolutionary swipe-based meal planning experience
  - 50-80% cost reduction on image generation
  - Enhanced user control and engagement
  - Full backend + iOS implementation complete
  - Ready for production testing

  🔄 **Immediate Next Steps**:
  1. ✅ Begin Phase 3 (Recipe Library & AI Generation) - Recipe Library COMPLETE
  2. Implement AI Recipe Generation (Phase 3.2)
  3. Implement PantryPal feature (Phase 3.3)
  4. Continue monitoring Tasting Menu performance and user feedback
  5. Test recipe library filtering and favoriting features

  📊 **Key Achievements**:
  - ✅ Complete authentication flow (Firebase + Backend sync)
  - ✅ Stripe subscription integration
  - ✅ Meal plan generation (Traditional + Tasting Menu)
  - ✅ Meal plan display with images
  - ✅ Recipe library with grid/list views
  - ✅ Recipe favoriting and filtering (cuisine, difficulty, cooking time)
  - ✅ Recipe detail view with full instructions
  - ✅ Usage limit enforcement (Free tier: 1 plan)
  - ✅ AI-powered recipe creation (GPT-4o + Gemini images)
  - ✅ Cloudinary CDN integration
  - ✅ DTO transformation for backend compatibility
  - ✅ Enhanced error handling and logging

  ---
