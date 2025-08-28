import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Sparkles, 
  Clock, 
  ListChecks, 
  UtensilsCrossed, 
  ChefHat,
  BookOpen,
  Heart,
  Sliders,
  Apple,
  Wand,
  ChevronDown,
  ChevronUp,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { logoUrl } from "@/lib/constants";
import { useState } from "react";
import Footer from "@/components/Footer";

export default function Welcome() {
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);

  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const isFaqExpanded = (index: number) => expandedFaqs.includes(index);

  // FAQ data
  const faqItems = [
    {
      question: "What if I don't like the meal suggestions?",
      answer: "Well, that makes two of us. Sometimes our AI has the culinary taste of a toddler with a sugar rush. But fear not! You can always hit that \"regenerate\" button until you find something that doesn't make you question technology's place in the kitchen. We promise to keep trying until we find recipes that don't make you regret signing up."
    },
    {
      question: "Can I cancel my premium subscription anytime?",
      answer: "Absolutely! We believe in commitment issues as much as you do. Cancel anytime with zero guilt trips—we'll just quietly sob into our server logs and wonder where we went wrong. Our developers might name a bug after you, but that's the extent of our revenge plan."
    },
    {
      question: "What makes your ingredient zapping tool better than just Googling substitutes?",
      answer: "Google will tell you to substitute butter with applesauce and pretend it's the same thing. Our system will at least acknowledge the existential crisis your recipe is about to have."
    },
    {
      question: "What makes Dine-N stand out from other meal planning apps?",
      answer: "Unlike other meal planning apps that just throw recipes at you, we've built personalization into our DNA. Our AI actually learns what your family loves (and secretly hates but is too polite to mention). We've crafted our ingredient-matching system to work with what you already have in your pantry—no more exotic spice emergency runs. Plus, our Ingredient Zapping tool is like having a culinary escape artist on standby, finding clever substitutions when you're missing something. And yes, we do all this with a sense of humor because meal planning shouldn't feel like filing your taxes. Turns out people actually enjoy using software that doesn't take itself too seriously!"
    },
    {
      question: "What value will I get out of Dine-N?",
      answer: "The average person spends 36 minutes just deciding what to cook (we made that up, but it feels true). Dine-N cuts that decision fatigue down to seconds. Our smart meal planning handles the thinking so you can focus on the cooking—or in many cases, the eating! We're not just saving you time planning; we're optimizing your grocery shopping, reducing food waste, and turning 'What's for dinner?' from a daily crisis into a solved problem. The real value? More home-cooked meals that actually make it to your table instead of remaining aspirational Pinterest pins. Think of us as the bridge between your good intentions and your actual dinner plate."
    },
    {
      question: "Does Dine-N have an iOS app?",
      answer: "Not yet, but we're dreaming about it! As a small, family-owned operation, we're currently focused on making our web platform the best it can be. The good news is that our website is fully mobile-responsive, so you can access all features from your phone's browser without missing out. You can even add Dine-N to your iOS home screen for an app-like experience: just open Safari, visit our site, tap the share icon, and select 'Add to Home Screen'. You'll get our beautiful icon on your home screen and a full-screen browsing experience. When we're ready to build native apps, our loyal users will be the first to know (and probably the first to hear us complain about App Store review times)."
    },
    {
      question: "Will this actually save me time in the kitchen?",
      answer: "Look, we made an app, not a personal chef robot (though our founder keeps pitching that at meetings). We can't promise miracles, but we can promise that the time you used to spend staring blankly into your fridge will now be spent staring blankly at our app instead. Progress! And hey, at least with us, the fridge doesn't judge your pajama choices at 11pm."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/10">
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="container flex flex-col items-center justify-center px-4 py-8">
          {/* Logo Section */}
          <div className="mb-4">
            <img src={logoUrl} alt="Dine-N" className="h-32" />
            <h2 className="text-3xl font-bold text-center text-primary mt-2">Dine-N</h2>
          </div>

          {/* Hero Content */}
          <div className="max-w-xl text-center space-y-6">
            <p className="text-xl text-muted-foreground">
              More Home Cooked Meals, Less Hassle
            </p>

            {/* CTA Button */}
            <div className="flex flex-col gap-4 mt-4">
              <Button asChild size="lg" className="text-lg group">
                <Link href="/auth?tab=register">
                  Get Started <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Problem Statement Section */}
          <div className="mt-12 w-full">
            <div className="max-w-xl mx-auto text-center">
              <div className="p-6 bg-muted/50 rounded-lg">
                <p className="text-lg leading-relaxed">
                  Tired of staring into your fridge like it's an existential void? Stop cycling through the same five recipes you've been making since college.
                </p>
              </div>
            </div>
          </div>

          {/* Solution Cards Section */}
          <div className="mt-12 w-full">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Personalized Recipes</h3>
                <p className="text-muted-foreground">For when one kid hates onions, another is "trying keto," and your partner suddenly decided cilantro tastes like soap. We'll handle the family drama.</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 bg-primary/5 rounded-lg shadow-sm border border-primary/10">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ChefHat className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">Ingredient Zapping</h3>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Premium</span>
                </div>
                <p className="text-muted-foreground">Forgot to buy thyme? Accidentally purchased more kale than any human should own? Our AI has seen worse. We'll fix it.</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ListChecks className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Automated Planning</h3>
                <p className="text-muted-foreground">Because "dinner plan" shouldn't mean texting "what do you want to eat?" at 5:30 PM every day until someone says "I don't know, whatever."</p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">MyPantry Tracker</h3>
                <p className="text-muted-foreground">Finally, a digital witness to your grocery shopping impulses. Track what you actually have before buying your fifth jar of paprika "just in case."</p>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 w-full space-y-12">
            {/* Personalized Meal Plans Section */}
            <div className="space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 text-primary">
                <Sliders className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Personalization</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                Your Family, Your Rules
              </h2>
              <p className="text-xl text-muted-foreground font-medium">
                We'll create meal plans so personalized, your family might suspect you've been secretly reading their food diaries. From keto crusaders to picky toddlers, we've got algorithms for that.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Heart className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Dietary Preferences</h3>
                    <p className="text-muted-foreground">From vegan to "I only eat beige foods on Tuesdays," we've got you covered.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ChefHat className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Cooking Skill Level</h3>
                    <p className="text-muted-foreground">Whether you're a microwave maestro or home-chef hero, we'll meet you where you are.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Time Constraints</h3>
                    <p className="text-muted-foreground">Because sometimes you have 30 minutes, and sometimes you have "the kids are screaming" minutes.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Ingredient-Based Recipes Section */}
            <div className="space-y-6 pt-8 border-t relative z-10">
              <div className="inline-flex items-center gap-2 text-primary">
                <Apple className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Ingredient Explorer</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                Turn Ingredients into Inspiration
              </h2>
              <p className="text-xl text-muted-foreground font-medium">
                That random assortment of ingredients you panic-bought? We'll turn them into actual meals. It's like having a tiny chef living in your phone, but without the mess or judgment.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <UtensilsCrossed className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Smart Recipe Matching</h3>
                    <p className="text-muted-foreground">We'll figure out what to do with that forgotten butternut squash that's been judging you for weeks.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Creative Combinations</h3>
                    <p className="text-muted-foreground">Prepare to say "I would've never thought to put those together" (in a good way).</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <ListChecks className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Shopping Optimization</h3>
                    <p className="text-muted-foreground">See what else you need to complete the recipe.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Recipe Book Section */}
            <div className="space-y-6 pt-8 border-t relative z-10">
              <div className="inline-flex items-center gap-2 text-primary">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Recipe Book</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight">
                Your Digital Cookbook
              </h2>
              <p className="text-xl text-muted-foreground font-medium">
                Finally, a place to store recipes that isn't "screenshots I'll never find again" or "that food-stained notebook from 2009." Your culinary journey, all in one searchable place.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Heart className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Favorite Collections</h3>
                    <p className="text-muted-foreground">Organize recipes into custom collections.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <ChefHat className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      Ingredient Zapping Tool
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Premium</span>
                    </h3>
                    <p className="text-muted-foreground">Replace ingredients with AI-powered suggestions.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Pricing Cards Section - Mobile */}
          <div className="mt-12 w-full space-y-4">
            <h2 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h2>
            
            {/* Free Plan Card */}
            <div className="p-6 bg-card rounded-lg shadow-sm">
              <h3 className="text-2xl font-semibold mb-2">Free</h3>
              <p className="text-muted-foreground mb-4">Surprisingly useful, suspiciously generous</p>
              <p className="text-3xl font-bold mb-6">$0/mo</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <span>Basic meal planning</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <UtensilsCrossed className="h-3 w-3 text-primary" />
                  </div>
                  <span>Recipe search</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Heart className="h-3 w-3 text-primary" />
                  </div>
                  <span>Save favorites</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth?tab=register">Get Started</Link>
              </Button>
            </div>

            {/* Premium Plan Card */}
            <div className="p-6 bg-primary text-primary-foreground rounded-lg shadow-sm relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="px-3 py-1 bg-primary-foreground/10 text-primary-foreground text-sm rounded-full">
                  Popular
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Premium</h3>
              <p className="text-primary-foreground/80 mb-4">For when you're ready to commit to cooking greatness</p>
              <p className="text-3xl font-bold mb-2">$9.99/mo</p>
              <p className="text-primary-foreground/80 mb-6">Less than one takeout pizza, but infinitely more nutritious!</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span>Everything in Free</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <ChefHat className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span>AI Ingredient Zapping</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <Wand className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span>Advanced customization</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span>Priority support</span>
                </li>
              </ul>
              <Button asChild variant="secondary" className="w-full">
                <Link href="/auth?tab=register">Get Premium</Link>
              </Button>
            </div>
          </div>

          {/* FAQ Section - Mobile */}
          <div className="mt-12 w-full">
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            
            <div className="flex flex-col gap-4">
              {faqItems.map((item, index) => (
                <div 
                  key={index} 
                  onClick={() => toggleFaq(index)}
                  className={cn(
                    "p-5 bg-card rounded-lg shadow-sm border border-border transition-all duration-200 ease-in-out",
                    "hover:border-primary/50 hover:shadow-md cursor-pointer",
                    isFaqExpanded(index) && "border-primary/50"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{item.question}</h3>
                    <div className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary transition-transform duration-200",
                      isFaqExpanded(index) && "rotate-180"
                    )}>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  <div className={cn(
                    "grid overflow-hidden transition-all duration-300 ease-in-out",
                    isFaqExpanded(index) ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"
                  )}>
                    <div className="overflow-hidden">
                      <p className="text-muted-foreground text-sm">{item.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col min-h-screen">
        {/* Hero Section */}
        <div className="container mx-auto flex flex-col items-center justify-center min-h-[60vh] px-4">
          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center">
            <img 
              src={logoUrl} 
              alt="Dine-N" 
              className="h-[24rem] w-auto object-contain"
            />
            <div className="mt-6 py-2">
              <div className={cn(
                "text-4xl lg:text-5xl xl:text-6xl font-bold px-6 py-2",
                "text-primary"
              )}>
                Dine-N
              </div>
            </div>
            <p className="text-xl lg:text-2xl text-muted-foreground mt-6 text-center max-w-lg font-medium">
            More Home Cooked Meals, Less Hassle
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="text-lg group">
                <Link href="/auth?tab=register">
                  Get Started <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Problem Statement Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="p-8 bg-muted/50 rounded-lg">
              <p className="text-xl leading-relaxed">
                Tired of staring into your fridge like it's an existential void? Stop cycling through the same five recipes you've been making since college. It's time your family remembered dinner for something other than your apologies.
              </p>
            </div>
          </div>
        </div>

        {/* Solution Cards Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-4 gap-6 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalized Recipes</h3>
              <p className="text-muted-foreground">For when one kid hates onions, another is "trying keto," and your partner suddenly decided cilantro tastes like soap. We'll handle the family drama.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 bg-primary/5 rounded-lg shadow-sm border border-primary/10">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold">Ingredient Zapping</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Premium</span>
              </div>
              <p className="text-muted-foreground">Forgot to buy thyme? Accidentally purchased more kale than any human should own? Trust us, we've seen worse. We'll fix it.</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ListChecks className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Automated Planning</h3>
              <p className="text-muted-foreground">Because "dinner plan" shouldn't mean texting "what do you want to eat?" at 5:30 PM every day until someone says "I don't know, whatever."</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg shadow-sm">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">MyPantry Tracker</h3>
              <p className="text-muted-foreground">Finally, a digital witness to your grocery shopping impulses. Track what you actually have before buying your fifth jar of paprika "just in case."</p>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-background relative z-0">
          {/* Personalized Meal Plans Section */}
          <div className="container mx-auto px-4 py-24 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 max-w-6xl mx-auto">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Sliders className="h-5 w-5" />
                  <span className="text-sm font-medium uppercase tracking-wider">Personalization</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight">
                  Your Family, Your Rules
                </h2>
                <p className="text-xl text-muted-foreground font-medium">
                  We'll create meal plans so personalized, your family might suspect you've been secretly reading their food diaries. From keto crusaders to picky toddlers, we've got algorithms for that.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Heart className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Dietary Preferences</h3>
                      <p className="text-muted-foreground">From vegan to "I only eat beige foods on Tuesdays," we've got you covered.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChefHat className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Cooking Skill Level</h3>
                      <p className="text-muted-foreground">Whether you're a microwave maestro or home-chef hero, we'll meet you where you are.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Time Constraints</h3>
                      <p className="text-muted-foreground">Because sometimes you have 30 minutes, and sometimes you have "the kids are screaming" minutes.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="flex-1 flex justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1494859802809-d069c3b71a8a" 
                  alt="Personalized Meal Plan Interface" 
                  className="rounded-lg shadow-2xl max-w-md w-full object-cover h-[400px]"
                />
              </div>
            </div>
          </div>

          {/* Ingredient-Based Recipes Section */}
          <div className="container mx-auto px-4 py-24 border-t relative z-10">
            <div className="flex flex-col-reverse lg:flex-row items-center gap-12 max-w-6xl mx-auto">
              <div className="flex-1 flex justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1660652377925-d615178531db" 
                  alt="Ingredient Explorer Interface" 
                  className="rounded-lg shadow-2xl max-w-md w-full object-cover h-[400px]"
                />
              </div>
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <Apple className="h-5 w-5" />
                  <span className="text-sm font-medium uppercase tracking-wider">Ingredient Explorer</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight">
                  Turn Ingredients into Inspiration
                </h2>
                <p className="text-xl text-muted-foreground font-medium">
                  That random assortment of ingredients you panic-bought? We'll turn them into actual meals. It's like having a tiny chef living in your phone, but without the mess or judgment.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <UtensilsCrossed className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Smart Recipe Matching</h3>
                      <p className="text-muted-foreground">We'll figure out what to do with that forgotten butternut squash that's been judging you for weeks.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Creative Combinations</h3>
                      <p className="text-muted-foreground">Prepare to say "I would've never thought to put those together" (in a good way).</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ListChecks className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Shopping Optimization</h3>
                      <p className="text-muted-foreground">See what else you need to complete the recipe.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Recipe Book Section */}
          <div className="container mx-auto px-4 py-24 border-t relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 max-w-6xl mx-auto">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                  <span className="text-sm font-medium uppercase tracking-wider">Recipe Book</span>
                </div>
                <h2 className="text-4xl font-bold tracking-tight">
                  Your Digital Cookbook
                </h2>
                <p className="text-xl text-muted-foreground font-medium">
                  Finally, a place to store recipes that isn't "screenshots I'll never find again" or "that food-stained notebook from 2009." Your culinary journey, all in one searchable place.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Heart className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold">Favorite Collections</h3>
                      <p className="text-muted-foreground">Organize recipes into custom collections.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-primary/5 p-4 rounded-lg border border-primary/10">
                    <ChefHat className="h-6 w-6 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        Ingredient Zapping Tool
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Premium</span>
                      </h3>
                      <p className="text-muted-foreground">Replace ingredients with AI-powered suggestions.</p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="flex-1 flex justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1498837167922-ddd27525d352" 
                  alt="Recipe Book Interface" 
                  className="rounded-lg shadow-2xl max-w-md w-full object-cover h-[400px]"
                />
              </div>
            </div>
          </div>

          {/* Pricing Tiers */}
          <div className="container mx-auto px-4 py-24 border-t">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight mb-4">Choose Your Plan</h2>
              <p className="text-xl text-muted-foreground">
                Free option for casual cooking chaos, Premium for those ready to get serious
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <div className="flex flex-col p-8 bg-card rounded-xl shadow-sm border border-border">
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
                <Button asChild variant="outline" size="lg" className="mt-auto">
                  <Link href="/auth?tab=register">
                    Get Started
                  </Link>
                </Button>
              </div>

              {/* Premium Tier */}
              <div className="flex flex-col p-8 bg-primary rounded-xl shadow-lg text-primary-foreground relative overflow-hidden">
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
                <Button asChild size="lg" variant="secondary" className="mt-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Link href="/auth?tab=register">
                    Upgrade to Premium
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="container mx-auto px-4 py-24 border-t">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
                <p className="text-xl text-muted-foreground">
                  Things you might be wondering but were too polite to ask
                </p>
              </div>
              
              <div className="grid gap-4">
                {faqItems.map((item, index) => (
                  <div 
                    key={index} 
                    onClick={() => toggleFaq(index)}
                    className={cn(
                      "p-6 bg-card rounded-xl shadow-sm border border-border transition-all duration-200 ease-in-out",
                      "hover:border-primary/50 hover:shadow-md cursor-pointer",
                      isFaqExpanded(index) && "border-primary/50"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">{item.question}</h3>
                      <div className={cn(
                        "flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary transition-transform duration-200",
                        isFaqExpanded(index) && "rotate-180"
                      )}>
                        <ChevronDown className="h-5 w-5" />
                      </div>
                    </div>
                    <div className={cn(
                      "grid overflow-hidden transition-all duration-300 ease-in-out",
                      isFaqExpanded(index) ? "grid-rows-[1fr] mt-4" : "grid-rows-[0fr]"
                    )}>
                      <div className="overflow-hidden">
                        <p className="text-muted-foreground">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Final CTA Section */}
          <div className="container mx-auto px-4 py-24 border-t">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-4xl font-bold tracking-tight">
                Ready to Transform Your Kitchen Experience?
              </h2>
              <p className="text-xl text-muted-foreground">
                Join thousands of families who have graduated from "it's edible" to "can I have the recipe?" We can't promise culinary genius, but we can definitely help you avoid the takeout speed dial... again.
              </p>
              <div className="flex justify-center">
                <Button asChild size="lg" className="text-lg group">
                  <Link href="/auth?tab=register">
                    Save Dinner Time <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
} 