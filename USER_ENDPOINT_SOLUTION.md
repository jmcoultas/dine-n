# User Endpoint Solutioning Document

## Overview

The `/api/user` endpoint and related user management endpoints form the core authentication and authorization system for the Dine-N application. This document provides a comprehensive technical overview of how user data flows through the system, drives application features, and integrates with external services like Firebase and Stripe.

## 1. Core User Endpoints

### Primary Endpoints

#### `GET /api/user`
- **Purpose**: Retrieves current authenticated user data
- **Authentication**: Required (session or Firebase token)
- **Response**: PublicUser object with subscription status, preferences, and usage counters
- **Key Features**:
  - Fetches fresh data from database on each request
  - Returns user in format expected by iOS app
  - Excludes sensitive fields (password_hash)

#### `PUT /api/user/profile`
- **Purpose**: Updates user preferences and completes onboarding
- **Authentication**: Required
- **Body**: `{ preferences: PreferenceSchema }`
- **Key Features**:
  - Validates preferences using Zod schema
  - Clears `is_partial_registration` flag when preferences are saved
  - Handles Google sign-in users completing onboarding

### Authentication Endpoints

#### `POST /api/register`
- **Purpose**: Complete user registration with email/password
- **Body**: `{ email, password, name? }`
- **Key Features**:
  - Supports Firebase token for cross-platform sync
  - Handles partial registration completion
  - Creates Firebase custom token for authentication
  - Prevents duplicate email registrations
  - Cross-browser registration completion support

#### `POST /api/register/partial`
- **Purpose**: Creates user record with email verification (mobile flow)
- **Body**: `{ email, verified_by_oobcode? }`
- **Key Features**:
  - Creates user with temporary password
  - Sets `is_partial_registration: true`
  - Supports mobile verification without Firebase token
  - Handles Firebase user lookup for existing accounts

#### `POST /api/login`
- **Purpose**: Authenticates user with email/password
- **Body**: `{ email, password }`
- **Key Features**:
  - Dual authentication: session-based and Firebase token
  - Handles Firebase-only users by creating database records
  - Updates Firebase UID if missing
  - Creates Firebase custom token for mobile apps
  - Partial registration detection and guidance

#### `POST /api/logout`
- **Purpose**: Terminates user session
- **Authentication**: Required
- **Key Features**:
  - Destroys server-side session
  - Clears client-side authentication state

#### `POST /api/auth/google`
- **Purpose**: Google OAuth authentication
- **Body**: `{ idToken, isNewUser }`
- **Key Features**:
  - Verifies Firebase ID token
  - Creates new users or links existing accounts
  - Sets `is_partial_registration: true` for new Google users
  - Creates Firebase custom token

## 2. User Data Model

### Database Schema (`db/schema.ts`)

```typescript
export const users = pgTable("users", {
  // Core Identity
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  name: text("name"),
  password_hash: text("password_hash").notNull(),
  
  // Firebase Integration
  firebase_uid: text("firebase_uid").unique(),
  
  // User Preferences
  preferences: jsonb("preferences").$type<PreferenceSchema>(),
  
  // Stripe Integration
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  
  // Subscription Management
  subscription_status: text("subscription_status").$type<SubscriptionStatusEnum>().default('inactive'),
  subscription_tier: text("subscription_tier").$type<SubscriptionTierEnum>().default('free'),
  subscription_end_date: timestamp("subscription_end_date", { mode: 'date' }),
  subscription_renewal_date: timestamp("subscription_renewal_date", { mode: 'date' }),
  
  // Usage Tracking
  meal_plans_generated: integer("meal_plans_generated").default(0).notNull(),
  ingredient_recipes_generated: integer("ingredient_recipes_generated").notNull().default(0),
  
  // System Flags
  created_at: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
  is_partial_registration: boolean("is_partial_registration").default(false),
  is_admin: boolean("is_admin").default(false).notNull(),
});
```

### User Preferences Schema

```typescript
export const PreferenceSchema = z.object({
  dietary: z.array(z.enum(["No Preference", "Vegetarian", "Vegan", "Gluten-Free", "Keto", "Paleo", "Mediterranean Diet", "Protein Heavy", "Organic"])),
  allergies: z.array(z.enum(["Dairy", "Eggs", "Tree Nuts", "Peanuts", "Shellfish", "Wheat", "Soy"])),
  cuisine: z.array(z.enum(["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"])),
  meatTypes: z.array(z.enum(["Chicken", "Beef", "Pork", "Fish", "Lamb", "Turkey", "None"])),
  chefPreferences: ChefPreferencesSchema
});
```

### PublicUser Type

```typescript
export type PublicUser = Omit<User, 'password_hash'> & {
  firebaseToken?: string;
};
```

## 3. Authentication & Authorization Flow

### Dual Authentication System

The application supports two authentication methods:

1. **Session-based Authentication** (Web App)
   - Uses Passport.js with LocalStrategy
   - Stores user session in memory store
   - Serializes user ID in session

2. **Firebase Token Authentication** (iOS App)
   - Verifies Firebase ID tokens
   - Looks up user by Firebase UID or email
   - Creates custom Firebase tokens for mobile apps

### Authentication Middleware (`isAuthenticated`)

```typescript
async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // First check session-based auth
  if (req.isAuthenticated()) {
    return next();
  }

  // Then check Firebase token
  const firebaseToken = req.headers['firebase-token'] as string | undefined;
  if (firebaseToken) {
    const decodedToken = await auth.verifyIdToken(firebaseToken);
    const [user] = await db.select().from(users)
      .where(or(eq(users.firebase_uid, uid), eq(users.email, email.toLowerCase())))
      .limit(1);
    
    req.user = publicUser;
    return next();
  }

  res.status(401).json({ error: "Not authenticated" });
}
```

### User Serialization/Deserialization

- **Serialization**: Stores only user ID in session
- **Deserialization**: Fetches full user data from database
- **PublicUser Creation**: Excludes password_hash, adds defaults for optional fields

## 4. Subscription Management Integration

### Subscription Tiers and Statuses

- **Tiers**: `free` | `premium`
- **Statuses**: `active` | `inactive` | `cancelled`

### Stripe Webhook Integration

The system processes Stripe webhooks to update user subscription data:

```typescript
// Example webhook handler for subscription updates
case 'customer.subscription.created':
case 'customer.subscription.updated':
  await tx.update(users)
    .set({
      subscription_status: 'active' as const,
      subscription_tier: 'premium' as const,
      subscription_renewal_date: subscriptionEndDate,
      subscription_end_date: null,
      stripe_subscription_id: subscriptionId
    })
    .where(eq(users.id, customer.id));
```

### Subscription Middleware (`requireActiveSubscription`)

```typescript
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const [user] = await db.select({
    subscription_status: users.subscription_status,
    subscription_tier: users.subscription_tier,
    subscription_end_date: users.subscription_end_date,
  }).from(users).where(eq(users.id, req.user.id)).limit(1);

  const hasPremiumAccess = user.subscription_tier === 'premium' && 
    (user.subscription_status === 'active' || 
     (user.subscription_status === 'cancelled' && user.subscription_end_date && new Date() <= user.subscription_end_date));

  if (!hasPremiumAccess) {
    return res.status(403).json({
      error: 'Premium subscription required',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }

  next();
}
```

### Usage Limits

- **Meal Plans**: Tracked via `meal_plans_generated` counter
- **Recipe Generation**: Tracked via `ingredient_recipes_generated` counter
- **Premium Features**: Gated by subscription status

## 5. Registration Flows

### Standard Registration Flow

1. User submits email/password
2. System validates input and checks for duplicates
3. Creates Firebase user (if token provided)
4. Hashes password and stores in database
5. Creates Firebase custom token
6. Logs user in via session

### Partial Registration Flow (Mobile)

1. User submits email for verification
2. System creates user with `is_partial_registration: true`
3. Sets temporary password hash
4. User completes email verification
5. User submits password to complete registration
6. System updates password and clears partial flag

### Google OAuth Flow

1. User authenticates with Google via Firebase
2. System receives Firebase ID token
3. Creates or links user account
4. Sets `is_partial_registration: true` for new users
5. User completes onboarding to clear partial flag

### Limbo State Prevention

The system prevents users from getting stuck in "limbo" states by:
- Creating database records for Firebase-only users during login
- Linking existing accounts when Firebase UID matches email
- Providing recovery mechanisms for incomplete registrations

## 6. Application Feature Access Control

### Meal Plan Generation

```typescript
// Example usage in meal plan generation
app.post("/api/meal-plans/generate", isAuthenticated, async (req: Request, res: Response) => {
  const user = req.user!;
  
  // Check subscription for premium features
  if (user.subscription_tier !== 'premium') {
    return res.status(403).json({ error: 'Premium subscription required' });
  }
  
  // Increment usage counter
  await db.update(users)
    .set({ meal_plans_generated: user.meal_plans_generated + 1 })
    .where(eq(users.id, user.id));
});
```

### Admin Dashboard Access

```typescript
// Admin middleware checks is_admin flag
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

### Pantry Management

- All users can access basic pantry features
- Premium users get advanced analytics and suggestions
- Usage tracking for recipe suggestions

## 7. Frontend Integration

### useUser Hook (`client/src/hooks/use-user.ts`)

```typescript
export function useUser(): UserQueryResult {
  const queryClient = useQueryClient();
  const query = useQuery<AuthUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: handleLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return { ...query, login: loginMutation.mutateAsync };
}
```

### User Data Fetching

```typescript
async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null; // Not authenticated
    }
    throw new Error('Failed to fetch user');
  }

  return response.json();
}
```

### Firebase Token Management

- Tokens are created server-side after successful authentication
- Frontend initializes Firebase auth with custom tokens
- Tokens are included in API requests for mobile app compatibility

## 8. Key Files Reference

### Backend Files

- **`server/auth.ts`** - Authentication setup, registration endpoints, Passport configuration
- **`server/routes.ts`** - User profile endpoints, `isAuthenticated` middleware
- **`server/types.ts`** - User and PublicUser type definitions
- **`server/middleware/subscription.ts`** - Subscription validation middleware
- **`server/middleware/admin.ts`** - Admin role checking middleware
- **`db/schema.ts`** - User table schema and validation schemas
- **`server/services/stripe.ts`** - Stripe webhook subscription updates
- **`server/services/firebase.ts`** - Firebase custom token creation

### Frontend Files

- **`client/src/hooks/use-user.ts`** - User state management with React Query
- **`client/src/lib/firebase.ts`** - Firebase authentication helpers
- **`client/src/lib/types.ts`** - Frontend type definitions

## 9. Security Considerations

### Password Security

- Passwords are hashed using Node.js crypto.scrypt
- Salt is generated for each password
- Timing-safe comparison prevents timing attacks

### Session Security

- Sessions use secure cookies in production
- Memory store with automatic cleanup
- Session secrets are environment-specific

### Firebase Integration

- Firebase tokens are verified server-side
- Custom tokens are created for mobile app authentication
- Firebase UID is stored for cross-platform user linking

## 10. Error Handling

### Authentication Errors

- Clear error messages for different failure types
- Specific error codes for frontend handling
- Graceful fallbacks for Firebase token failures

### Registration Errors

- Duplicate email detection
- Validation error details
- Partial registration state management

### Subscription Errors

- Clear subscription status messages
- Grace period handling for cancelled subscriptions
- Usage limit enforcement

## Conclusion

The `/api/user` endpoint system provides a robust foundation for user management, authentication, and feature access control in the Dine-N application. The dual authentication system supports both web and mobile clients, while the subscription integration enables flexible pricing models. The comprehensive error handling and limbo state prevention ensure a smooth user experience across all registration and authentication flows.
