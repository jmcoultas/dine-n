# DineN Backend & Web - Project Status
**Last Updated**: December 9, 2025
**Location**: `/Users/JohnCoultas/dine-n web and MW/`

---

## 📍 Quick Reference

### Active Documentation Files
- `AI_RECIPE_GENERATION.md` - Recipe generation feature spec
- `PANTRY_INVENTORY.md` - Pantry management spec
- `PANTRY_ANALYTICS.md` - Analytics feature spec (planned)
- `PRODUCTION_POLISH.md` - Production readiness checklist
- `ENVIRONMENT_SETUP.md` - Development environment setup
- `MYPANTRY_IMPLEMENTATION.md` - Backend pantry implementation details
- `USER_ENDPOINT_SOLUTION.md` - User management endpoints
- `INSTACART_INTEGRATION.md` - Future grocery integration spec

### Master Documentation
- `/Users/JohnCoultas/DINEN_PROJECT_OVERVIEW.md` - Full project overview
- `/Users/JohnCoultas/DINEN_ROADMAP.md` - Development roadmap
- `/Users/JohnCoultas/CLAUDE.md` - Comprehensive project documentation

---

## 🏗️ Backend Architecture

### Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Firebase Admin SDK
- **Payments**: Stripe
- **AI Services**:
  - OpenAI GPT-4o for recipe text generation
  - Google Gemini 2.5 Flash for image generation
- **Image Storage**: Cloudinary CDN
- **Deployment**: Production at https://dinen.ai

### Project Structure
```
dine-n web and MW/
├── server/
│   ├── routes.ts           # Main API routes
│   ├── index.ts            # Server entry point
│   └── middleware/         # Custom middleware
├── db/
│   ├── schema.ts           # Database schema (Drizzle)
│   └── migrations/         # Database migrations
├── client/                 # Web UI (React)
├── node_modules/           # Dependencies
├── .env                    # Environment variables (not in git)
└── package.json            # NPM dependencies
```

---

## ✅ Implemented API Endpoints

### Authentication
- `POST /api/auth/firebase-token` - Authenticate with Firebase token
  - Validates Firebase ID token
  - Creates or updates user in PostgreSQL
  - Returns user profile

### User Management
- `GET /api/user` - Get user profile
  - Returns user data with subscription status
- `PUT /api/user/profile` - Update user profile
  - Update dietary preferences, name, etc.

### Meal Planning
- `POST /api/generate-meal-plan` - Generate complete meal plan
  - Traditional flow: 21 recipes with images
  - Uses GPT-4o for recipe text
  - Uses Gemini 2.5 Flash for images
  - Uploads to Cloudinary
  - **Time**: ~3-5 minutes
  - **Cost**: ~$0.21 per plan (with Gemini)

- `POST /api/generate-meal-plan-preview` - Tasting Menu preview generation
  - Generates 21 recipe title/description cards
  - Uses GPT-4o (minimal tokens)
  - No images generated
  - Caches preview with 30-min TTL
  - **Time**: ~30 seconds
  - **Cost**: ~$0.02

- `POST /api/generate-meal-plan-from-preview` - Generate from selections
  - Takes user's selected recipes from preview
  - Generates full recipes with images
  - Only for selected items (cost optimization)
  - **Time**: ~1-2 minutes
  - **Cost**: ~$0.05-$0.21 (depending on selections)

- `GET /api/meal-plans/current` - Get current meal plan
- `GET /api/meal-plans` - Get all user's meal plans
- `GET /api/meal-plans/:id` - Get specific meal plan

### Recipes
- `GET /api/recipes` - Fetch user's recipe library
  - Supports filtering (cuisine, difficulty, time)
  - Pagination support
- `POST /api/recipes/:id/favorite` - Toggle favorite status
- `POST /api/generate-recipe` - Generate single custom recipe
  - AI-powered with user preferences
  - Includes image generation
  - Saves to user's library

### Pantry (MyPantry)
- `GET /api/pantry` - Fetch pantry items
  - Filter by category, location
  - **Note**: `location` field not fully supported yet
- `POST /api/pantry` - Add pantry item
  - **Note**: Backend uses `quantity_status` field (not `quantity`)
- `PUT /api/pantry/:id` - Update pantry item
- `DELETE /api/pantry/:id` - Delete pantry item
- `POST /api/pantry/:id/use` - Mark item as used (planned)
- `GET /api/pantry/autocomplete` - Ingredient autocomplete

### Subscriptions
- `GET /api/subscription/status` - Get user's subscription
- `POST /api/subscription/create-checkout` - Create Stripe checkout
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/subscription/webhook` - Stripe webhook handler

---

## 🗄️ Database Schema

### Key Tables

#### users
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,          -- Firebase UID
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  dietary_restrictions TEXT[],
  allergies TEXT[],
  cuisine_preferences TEXT[],
  meat_types TEXT[],
  serving_size INT DEFAULT 2,
  skill_level VARCHAR(50),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50),
  stripe_customer_id VARCHAR(255),
  meal_plans_generated INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### meal_plans
```sql
CREATE TABLE meal_plans (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  days INT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### recipes
```sql
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  meal_plan_id INT REFERENCES meal_plans(id),
  day INT,
  meal_type VARCHAR(50),              -- breakfast, lunch, dinner
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ingredients JSONB,                  -- Array of ingredient objects
  instructions JSONB,                 -- Array of step objects
  prep_time INT,
  cook_time INT,
  total_time INT,
  servings INT,
  difficulty VARCHAR(50),
  cuisine VARCHAR(100),
  image_url TEXT,
  image_prompt TEXT,
  is_favorite BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### pantry_items
```sql
CREATE TABLE pantry_items (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),              -- produce, dairy, proteins, etc.
  quantity_status VARCHAR(50),        -- full, half, running_low, empty
  location VARCHAR(50),               -- pantry, fridge, freezer
  added_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### subscriptions
```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50),                 -- active, canceled, past_due
  plan_id VARCHAR(50),                -- price_xxx from Stripe
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔑 Environment Variables

Required in `.env` file:

```bash
# Database
DATABASE_URL=postgresql://...

# Firebase
FIREBASE_PROJECT_ID=dinen-app
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Google Gemini
GOOGLE_AI_API_KEY=AIza...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_... (Premium subscription)

# Server
PORT=3000
NODE_ENV=production
```

---

## 🚀 Deployment

### Production
- **URL**: https://dinen.ai
- **Hosting**: Replit (or other platform)
- **Database**: Neon PostgreSQL (serverless)

### Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run database migrations
npm run db:push

# Generate Drizzle types
npm run db:generate
```

---

## 🔄 Current Status

### ✅ Completed
- Authentication flow (Firebase + PostgreSQL sync)
- Meal plan generation (both traditional and Tasting Menu)
- Recipe generation with AI
- Image generation and CDN upload
- Pantry CRUD operations (partial)
- Subscription management (Stripe)
- User profile management
- Recipe favoriting
- Round-robin cuisine rotation

### 🔄 In Progress
- Pantry `location` field support
- Usage tracking and analytics
- Error logging and monitoring

### 📋 Planned
- Redis cache for preview sessions (currently in-memory)
- PantryPal endpoint (generate recipes from pantry)
- Pantry analytics endpoints
- Shopping list generation
- Recipe sharing endpoints
- Webhook for pantry quantity updates

---

## 🐛 Known Issues

### High Priority
1. **Pantry Location Field**: Backend doesn't support `location` field yet
   - iOS defaults all items to "pantry"
   - Need to update schema and endpoints

2. **Preview Cache**: Using in-memory cache
   - Will lose data on server restart
   - Should migrate to Redis for production

3. **Error Recovery**: Limited error recovery for:
   - Failed image uploads
   - Partial recipe generation
   - Stripe webhook failures

### Medium Priority
1. **Rate Limiting**: No rate limiting on expensive endpoints
2. **Logging**: Limited structured logging
3. **Monitoring**: No performance monitoring yet

---

## 🧪 Testing

### Manual Testing
- ✅ Meal plan generation (traditional)
- ✅ Tasting Menu flow (preview + selection)
- ✅ Recipe generation
- ✅ Pantry CRUD operations
- ✅ Subscription creation and cancellation
- ⏸️ Full end-to-end flows with iOS app

### Automated Testing
- ⏸️ Unit tests for business logic
- ⏸️ Integration tests for API endpoints
- ⏸️ Load testing for expensive operations

---

## 📊 Performance Metrics

### Current Performance
- **Traditional Meal Plan**: ~3-5 minutes
- **Tasting Menu Preview**: ~30 seconds
- **Tasting Menu Full**: ~1-2 minutes (depending on selections)
- **Single Recipe**: ~15-20 seconds
- **Image Generation**: ~3-5 seconds per image

### Cost per Operation
- **Traditional Meal Plan**: ~$0.21 (GPT-4o + Gemini + Cloudinary)
- **Tasting Menu Preview**: ~$0.02 (GPT-4o only)
- **Tasting Menu Full**: ~$0.05-$0.21 (depends on selections)
- **Single Recipe**: ~$0.01 (GPT-4o + Gemini + Cloudinary)

---

## 🔗 API Integrations

### OpenAI GPT-4o
- **Purpose**: Recipe text generation
- **Model**: gpt-4o
- **Average Tokens**: 1,500 per recipe
- **Cost**: ~$0.015 per 1K tokens

### Google Gemini 2.5 Flash
- **Purpose**: Recipe image generation
- **Model**: gemini-2.5-flash
- **Cost**: ~$0.01 per image
- **Format**: Base64 PNG

### Cloudinary
- **Purpose**: Image storage and CDN
- **Upload**: Via Node.js SDK
- **Transforms**: Automatic optimization
- **Cost**: Free tier sufficient for now

### Stripe
- **Purpose**: Subscription payments
- **Products**: Premium subscription ($4.99/month)
- **Webhooks**: subscription.created, subscription.deleted
- **Test Mode**: Enabled for development

### Firebase
- **Purpose**: User authentication
- **Methods**: Email/password, Google (future)
- **Admin SDK**: For token verification on backend

---

## 🎯 Next Steps

### Immediate (This Week)
1. Fix pantry `location` field support
2. Add comprehensive error logging
3. Test end-to-end with iOS app
4. Monitor production stability

### Short Term (Next 2 Weeks)
1. Implement Redis cache for previews
2. Add rate limiting to expensive endpoints
3. Improve error recovery
4. Performance monitoring setup

### Medium Term (Next Month)
1. PantryPal endpoints implementation
2. Pantry analytics endpoints
3. Automated testing suite
4. Load testing and optimization

---

**For more details, see:**
- `/Users/JohnCoultas/DINEN_PROJECT_OVERVIEW.md` - Full project overview
- `/Users/JohnCoultas/DINEN_ROADMAP.md` - Development roadmap
- Individual feature spec files in this directory
