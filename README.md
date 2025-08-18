# Dine-N: AI-Powered Personalized Meal Planning

<div align="center">
  <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop&crop=center" alt="Dine-N Logo" width="120" height="120" style="border-radius: 50%;">
  
  **More Home Cooked Meals, Less Hassle**
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
</div>

## 🍽️ Overview

Dine-N is a full-stack AI-powered meal planning application that transforms the way families approach home cooking. Using advanced AI technology, it creates personalized meal plans tailored to your dietary preferences, allergies, cooking skills, and family dynamics. Say goodbye to the daily "what's for dinner?" struggle!

### ✨ Key Features

- **🤖 AI-Powered Meal Planning**: Generate personalized weekly meal plans using OpenAI GPT
- **🥗 Dietary Accommodation**: Support for vegetarian, vegan, keto, gluten-free, and 20+ dietary preferences
- **🧑‍🍳 Skill-Based Recipes**: Recipes matched to your cooking confidence level
- **🛒 Smart Grocery Lists**: Automatically generated shopping lists from your meal plans
- **📱 Progressive Web App**: Install on mobile devices for offline access
- **💳 Flexible Pricing**: Free tier with premium features available

---

## 🎯 Core Functionality

### 🏠 **Home & Welcome Experience**
- **Landing Page**: Interactive hero section with dual pathways for meal planning vs recipe discovery
- **Feature Showcase**: Highlights of smart search, favorites, and quick access features
- **Pricing Overview**: Clear comparison between Free and Premium tiers

### 🔐 **Authentication System**
- **Firebase Integration**: Secure authentication with email/password and Google sign-in
- **Email Verification**: Complete registration flow with email verification
- **Cross-Browser Support**: Seamless authentication across different browsers and devices
- **Password Recovery**: Built-in password reset functionality

### 🍳 **Meal Planning Engine**

#### **Weekly Planner**
- Generate personalized meal suggestions for 2-7 days
- Select from AI-curated breakfast, lunch, and dinner options
- Mix and match recipes or use archived favorites
- Cooldown system prevents meal plan spam

#### **Preference Management**
- **Dietary Restrictions**: 15+ options including vegetarian, vegan, keto, paleo, gluten-free
- **Allergy Management**: Comprehensive allergy tracking and avoidance
- **Cuisine Preferences**: 20+ international cuisines from Italian to Thai
- **Protein Choices**: Flexible meat, seafood, and plant-based options
- **Chef Preferences**: Difficulty level, cooking time, and serving size customization

#### **Smart Recipe Generation**
- Parallel processing for 50% faster generation times
- Nutritional information calculation
- Ingredient substitution suggestions (Premium)
- Recipe regeneration for failed attempts

### 🥘 **Recipe Discovery**

#### **Ingredient-Based Recipes (PantryPal)**
- Transform available ingredients into complete recipes
- AI-powered ingredient matching and creative combinations
- Shopping optimization suggestions
- Allergy-safe recipe modifications

#### **Recipe Management**
- Save and organize favorite recipes
- Custom recipe collections
- Recipe rating and review system
- Permanent recipe storage for premium users

### 📊 **User Profile & Settings**

#### **Profile Management**
- Personal information and preferences
- Subscription status and billing management
- Theme customization (light/dark mode)
- Account settings and privacy controls

#### **Subscription System**
- **Free Tier**: 1 meal plan generation, basic features, recipe search
- **Premium Tier ($9.99/mo)**: Unlimited meal plans, ingredient zapping, advanced features
- **Stripe Integration**: Secure payment processing and subscription management
- **Cancellation**: Retain access until billing period ends

### 🛒 **Grocery & Shopping**
- Automated grocery list generation from meal plans
- Ingredient optimization and duplicate removal
- Shopping list export and sharing
- Instacart integration for grocery delivery

---

## 🏗️ Technical Architecture

### **Frontend Stack**
- **React 18** with TypeScript for type safety
- **Wouter** for lightweight client-side routing
- **TanStack React Query** for server state management
- **Tailwind CSS** with custom theming
- **Radix UI** components with shadcn/ui styling
- **Vite** for fast development and optimized builds

### **Backend Stack**
- **Node.js** with Express.js framework
- **TypeScript** for full-stack type safety
- **PostgreSQL** with Drizzle ORM for database management
- **Passport.js** for session management
- **Firebase Admin SDK** for authentication

### **External Services**
- **OpenAI GPT-4**: Recipe generation and meal planning AI
- **Firebase Auth**: User authentication and management
- **Stripe**: Payment processing and subscription management
- **Cloudinary**: Image hosting and optimization
- **Neon**: Serverless PostgreSQL hosting

### **Development Tools**
- **Drizzle Kit**: Database migrations and schema management
- **ESLint & Prettier**: Code quality and formatting
- **TypeScript**: Static type checking
- **Replit**: Development and deployment platform

---

## 🎨 Design System & Brand

### **Brand Identity**

Dine-N features a warm, professional design that reflects the joy and comfort of home cooking. Our design system emphasizes accessibility, usability, and visual harmony across all platforms.

#### **Primary Brand Colors**
- **Primary Orange**: `hsl(24, 80%, 50%)` - A warm, inviting orange that represents the warmth of home cooking
- **Professional Variant**: Clean, modern aesthetic suitable for both casual and professional use

#### **Theme System**

**Light Theme**
- Background: `hsl(0, 0%, 100%)` - Pure white for clean, bright interface
- Foreground: `hsl(222.2, 84%, 4.9%)` - Deep navy for excellent readability
- Muted: `hsl(210, 40%, 96.1%)` - Subtle gray for secondary content
- Accent: `hsl(210, 40%, 96.1%)` - Consistent with muted for cohesive design

**Dark Theme**
- Background: `hsl(222.2, 84%, 4.9%)` - Rich dark navy for comfortable night viewing
- Foreground: `hsl(210, 40%, 98%)` - Near white for optimal contrast
- Muted: `hsl(217.2, 32.6%, 17.5%)` - Darker gray for subtle elements
- Accent: `hsl(217.2, 32.6%, 17.5%)` - Consistent accent color

#### **Meal Type Color System**
Our recipe and meal planning interfaces use contextual colors to enhance user experience:

- **🌅 Breakfast**: Orange/Amber gradient (`from-orange-50 to-amber-50`)
- **🌞 Lunch**: Green/Emerald gradient (`from-green-50 to-emerald-50`)
- **🌙 Dinner**: Blue/Indigo gradient (`from-blue-50 to-indigo-50`)
- **🍎 Snacks**: Purple/Pink gradient (`from-purple-50 to-pink-50`)
- **🍰 Desserts**: Pink/Rose gradient (`from-pink-50 to-rose-50`)

#### **Dietary Restriction Colors**
Visual indicators for dietary preferences and restrictions:

- **Vegetarian**: `bg-green-500` - Fresh green
- **Vegan**: `bg-emerald-500` - Rich emerald
- **Gluten-Free**: `bg-yellow-500` - Bright yellow
- **Dairy-Free**: `bg-blue-500` - Cool blue
- **Keto**: `bg-purple-500` - Royal purple
- **Paleo**: `bg-orange-500` - Natural orange
- **Low-Carb**: `bg-red-500` - Vibrant red

#### **Partner Integration Colors**
- **Instacart Integration**:
  - Dark Green: `#003D29` - Brand-consistent dark green
  - Light Cream: `#FAF1E5` - Warm, inviting background
  - Stroke Light: `#EFE9E1` - Subtle border color
  - Orange: `#FF7009` - Action color
  - Green: `#0AAD0A` - Success/confirmation color

### **Typography & Spacing**

#### **Font System**
- **Primary Font**: System font stack with custom sans-serif fallbacks
- **Font Loading**: CSS variable `var(--font-sans)` for consistent typography
- **Responsive Typography**: Tailwind's responsive type scale

#### **Border Radius System**
- **Large**: `var(--radius)` - 12px (0.75rem) for cards and major components
- **Medium**: `calc(var(--radius) - 2px)` - 10px for buttons and form elements
- **Small**: `calc(var(--radius) - 4px)` - 8px for small UI elements

### **Animation & Motion**

#### **Custom Animations**
- **Fade In**: Smooth 0.5s fade with subtle upward movement
- **Slide Animations**: 
  - Left: 0.6s ease-out with 0.2s delay
  - Up: 0.6s ease-out with 0.4s delay  
  - Right: 0.6s ease-out with 0.6s delay
- **Progressive Loading**: Staggered animations for engaging user experience

#### **Interactive States**
- Hover effects with smooth transitions
- Focus states for accessibility compliance
- Loading states with custom animations (including Snake game loader)

### **Component Design Patterns**

#### **Card System**
- Consistent card styling with `hsl(var(--card))` background
- Subtle shadows and borders for depth
- Responsive padding and margins

#### **Button Variants**
- Primary: Brand orange with white text
- Secondary: Muted background with dark text
- Destructive: Red for dangerous actions
- Ghost: Transparent with hover states

#### **Form Elements**
- Consistent input styling with `hsl(var(--input))` background
- Focus rings using `hsl(var(--ring))` color
- Error states with destructive color scheme

### **Accessibility Features**

#### **Color Contrast**
- WCAG AA compliant color combinations
- High contrast ratios between text and backgrounds
- Alternative text for all images and icons

#### **Dark Mode Support**
- System preference detection
- Manual toggle capability
- Consistent experience across themes
- Reduced eye strain in low-light conditions

#### **Responsive Design**
- Mobile-first approach
- Touch-friendly interface elements
- Progressive Web App capabilities
- Cross-platform consistency

### **Design Tools & Implementation**

#### **CSS Framework**
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Custom Properties**: Theme-aware color system
- **HSL Color Space**: Consistent color manipulation

#### **Component Library**
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-styled component system
- **Custom Components**: Recipe cards, meal planners, grocery lists

#### **Development Workflow**
- **Storybook**: Component documentation and testing
- **Theme Configuration**: JSON-based theme management
- **Hot Reload**: Real-time design iteration

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18 or higher
- PostgreSQL database
- OpenAI API key
- Firebase project
- Stripe account (for payments)
- Cloudinary account (for images)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dine-n.git
   cd dine-n
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL=your_postgresql_connection_string
   
   # OpenAI
   OPENAI_API_KEY=your_openai_api_key
   
   # Firebase
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   
   # Stripe
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

---

## 📱 Key User Journeys

### **New User Onboarding**
1. **Welcome Page**: Choose between meal planning or recipe discovery
2. **Registration**: Email verification or Google sign-in
3. **Preference Setup**: Guided setup of dietary preferences and restrictions
4. **First Meal Plan**: Generate your first personalized meal plan
5. **Grocery List**: Export shopping list for easy grocery shopping

### **Weekly Meal Planning**
1. **Access Planner**: Navigate to Weekly Planner from home page
2. **Set Preferences**: Customize dietary restrictions and preferences
3. **Generate Suggestions**: AI creates personalized meal suggestions
4. **Select Recipes**: Choose from breakfast, lunch, and dinner options
5. **Create Plan**: Finalize your weekly meal plan
6. **Get Groceries**: Export grocery list for shopping

### **Recipe Discovery**
1. **Ingredient Input**: Enter available ingredients
2. **AI Generation**: System suggests creative recipe combinations
3. **Recipe Selection**: Choose from multiple recipe options
4. **Save Favorites**: Add recipes to personal collection
5. **Cooking**: Follow step-by-step instructions

---

## 🔧 API Endpoints

### **Authentication**
- `POST /api/register/partial` - Start registration process
- `POST /api/register/complete` - Complete registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/auth/google` - Google OAuth

### **Meal Planning**
- `POST /api/generate-meal-plan` - Generate new meal plan
- `GET /api/meal-plans` - Get user's meal plans
- `POST /api/meal-plans` - Create meal plan
- `GET /api/meal-plans/current` - Get current active meal plan

### **Recipes**
- `POST /api/generate-recipe` - Generate single recipe
- `POST /api/ingredients-to-recipes` - Find recipes from ingredients
- `POST /api/substitute-ingredient` - Get ingredient substitutions (Premium)
- `GET /api/recipes` - Get saved recipes
- `POST /api/recipes/:id/favorite` - Toggle recipe favorite

### **Weekly Planner**
- `POST /api/weekly-planner/suggestions` - Get meal suggestions
- `POST /api/weekly-planner/create-plan` - Create plan from suggestions

### **Subscriptions**
- `GET /api/subscription/status` - Get subscription status
- `POST /api/subscription/create-checkout` - Create Stripe checkout
- `POST /api/subscription/cancel` - Cancel subscription
- `POST /api/webhook` - Stripe webhook handler

### **User Management**
- `GET /api/user` - Get current user
- `PUT /api/user/profile` - Update user profile
- `GET /api/temporary-recipes` - Get temporary recipes

---

## 💰 Subscription Tiers

### **Free Tier ($0/month)**
- ✅ 1 meal plan generation
- ✅ Basic recipe search
- ✅ Save favorite recipes
- ✅ Dietary preference management
- ✅ Basic grocery list generation

### **Premium Tier ($9.99/month)**
- ✅ **Everything in Free, plus:**
- ✅ Unlimited meal plan generation
- ✅ Ingredient-to-recipe tool (PantryPal)
- ✅ AI ingredient substitution
- ✅ Advanced meal planning (up to 7 days)
- ✅ Recipe collection management
- ✅ Priority customer support

---

## 🔒 Security & Privacy

- **Data Encryption**: All sensitive data encrypted in transit and at rest
- **Authentication**: Firebase Auth with secure session management
- **Payment Security**: PCI-compliant payment processing via Stripe
- **Privacy Controls**: Users control their data and can delete accounts
- **GDPR Compliant**: European privacy regulation compliance

---

## 🚀 Deployment

The application is designed for deployment on Replit but can be deployed to any Node.js hosting platform:

1. **Environment Setup**: Configure all environment variables
2. **Database Migration**: Run database migrations
3. **Build Process**: Build frontend assets
4. **Start Application**: Launch the Express server

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙋‍♂️ Support

- **Documentation**: Check our [Wiki](https://github.com/yourusername/dine-n/wiki)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/yourusername/dine-n/issues)
- **Email**: support@dine-n.com
- **Premium Support**: Available for Premium subscribers

---

## 🎉 Acknowledgments

- OpenAI for providing the GPT models that power our recipe generation
- The React and Node.js communities for excellent tooling
- All our beta testers who helped shape the product
- Food bloggers and chefs who inspired our recipe database

---

<div align="center">
  <p>Made with ❤️ and a lot of ☕</p>
  <p><strong>Happy Cooking! 🍳</strong></p>
</div> 