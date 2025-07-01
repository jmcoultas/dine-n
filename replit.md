# Dine-N: Personalized Meal Planning Application

## Overview

Dine-N is a full-stack personalized meal planning application that helps families create customized meal plans based on dietary preferences, allergies, and cooking preferences. The application uses AI to generate recipes and meal plans, with subscription-based premium features and comprehensive user preference management.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: Radix UI components with custom shadcn/ui styling
- **Styling**: Tailwind CSS with custom theme configuration
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: 
  - Firebase Authentication for user management
  - Passport.js with local strategy for session management
  - Custom Firebase token integration
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT for recipe generation and recommendations

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Image Storage**: Cloudinary CDN for recipe images
- **Object Storage**: Replit Object Storage for additional assets
- **Session Storage**: In-memory session store with express-session

## Key Components

### User Management System
- Firebase Authentication integration with custom backend user records
- User preferences system with comprehensive dietary, allergy, and cuisine options
- Subscription management with Stripe integration (free and premium tiers)
- Admin user functionality for system management

### Recipe Generation Engine
- AI-powered recipe generation using OpenAI GPT models
- Parallel processing for improved performance (50% reduction in generation time)
- Ingredient substitution recommendations
- Recipe generation from available ingredients
- Nutritional information calculation

### Meal Planning System
- Personalized meal plan creation based on user preferences
- Expiration management for generated meal plans
- Support for 2-day (free) and 7-day (premium) meal plans
- Grocery list generation from meal plans

### Subscription & Payment System
- Stripe integration for payment processing
- Webhook handling for subscription status updates
- Free tier limitations and premium feature unlocking
- Subscription expiration monitoring

## Data Flow

### Recipe Generation Flow
1. User submits preferences and dietary restrictions
2. System validates subscription tier and usage limits
3. AI service generates recipes in parallel using OpenAI
4. Images are generated and stored via Cloudinary
5. Recipes are saved to temporary storage with expiration dates
6. Meal plan is assembled and returned to user

### Authentication Flow
1. User authenticates via Firebase
2. Backend verifies Firebase token and creates/updates local user record
3. Session is established with user preferences loaded
4. Subscription status is checked for feature access

### Subscription Flow
1. User initiates subscription via Stripe checkout
2. Stripe webhooks update user subscription status
3. Feature access is dynamically controlled based on subscription tier
4. Expiration monitoring ensures proper access control

## External Dependencies

### Core Services
- **Firebase**: Authentication and user management
- **OpenAI**: AI-powered recipe generation and recommendations
- **Stripe**: Payment processing and subscription management
- **Cloudinary**: Image hosting and optimization
- **PostgreSQL**: Primary data storage via Neon serverless

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **Vite**: Frontend build tool with HMR
- **TypeScript**: Type safety across frontend and backend
- **ESLint/Prettier**: Code quality and formatting

## Deployment Strategy

### Build Process
- Frontend: Vite builds optimized React bundle with code splitting
- Backend: ESBuild compiles TypeScript to ES modules
- Database: Drizzle migrations applied automatically
- Environment: Production optimizations include terser minification and console removal

### Performance Optimizations
- **Parallel Recipe Generation**: Reduces meal plan creation time by 50%
- **Optimized AI Prompts**: 40% reduction in token usage while maintaining quality
- **Asynchronous Image Processing**: Non-blocking image generation and storage
- **Database Query Optimization**: Reduced round trips and improved error handling
- **Code Splitting**: Vendor and UI component chunks for better caching

### Monitoring & Reliability
- Performance timing metrics included in API responses
- Database connection health checks
- Subscription expiration background jobs
- Error handling with user-friendly messages
- Progressive Web App (PWA) capabilities for mobile users

## Changelog

```
Changelog:
- July 01, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```