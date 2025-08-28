import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Sparkles, 
  ChefHat, 
  UtensilsCrossed, 
  BookOpen, 
  Clock,
  Package
} from "lucide-react";

interface PricingCardProps {
  plan: 'free' | 'premium';
  className?: string;
  onUpgrade?: () => void;
  showGetStarted?: boolean;
}

export function PricingCard({ 
  plan, 
  className = "", 
  onUpgrade,
  showGetStarted = true 
}: PricingCardProps) {
  if (plan === 'free') {
    return (
      <div className={`flex flex-col p-8 bg-card rounded-xl shadow-sm border border-border ${className}`}>
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">Free</h3>
          <p className="text-muted-foreground">Surprisingly useful, suspiciously generous</p>
        </div>
        <div className="mb-6">
          <span className="text-4xl font-bold">$0</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <ul className="space-y-4 mb-8">
          <li className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Advanced AI-powered recipe suggestions</span>
          </li>
          <li className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <span>Personalized dietary adjustments</span>
          </li>
          <li className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <span>Access to top community recipes</span>
          </li>
          <li className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Generate a custom meal plan for your family</span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Automated grocery list generation</span>
          </li>
          <li className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span>MyPantry inventory tracking (up to 50 items)</span>
          </li>
        </ul>
        {showGetStarted && (
          <Button asChild variant="outline" size="lg" className="mt-auto">
            <Link href="/auth?tab=register">
              Get Started
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col p-8 bg-primary rounded-xl shadow-lg text-primary-foreground relative overflow-hidden ${className}`}>
      <div className="absolute top-4 right-4">
        <span className="px-3 py-1 bg-primary-foreground text-primary text-sm font-medium rounded-full">
          Popular
        </span>
      </div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Premium</h3>
        <p className="text-primary-foreground/80">For when you're ready to commit to cooking greatness</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold">$9.99</span>
        <span className="text-primary-foreground/80">/month</span>
      </div>
      <p className="text-primary-foreground/80 mt-1 mb-6">Less than one takeout pizza, but infinitely more nutritious!</p>
      <ul className="space-y-4 mb-8">
        <li className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span>Everything in Free, plus:</span>
        </li>
        <li className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5" />
          <span>Ingredients to Inspiration Tool</span>
        </li>
        <li className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <span>Full Cookbook Access, and more!</span>
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <span>Advanced meal planning & scheduling</span>
        </li>
        <li className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span>Access to our Ingredient Zapping tool</span>
        </li>
      </ul>
      <Button 
        size="lg" 
        variant="secondary" 
        className="mt-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        onClick={onUpgrade}
      >
        {showGetStarted ? (
          <Link href="/auth?tab=register">
            Upgrade to Premium
          </Link>
        ) : (
          "Upgrade to Premium"
        )}
      </Button>
    </div>
  );
} 