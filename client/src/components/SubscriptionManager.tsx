import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";

export function SubscriptionManager() {
  const { subscription, isLoading, createCheckoutSession, cancelSubscription } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Subscription Status</CardTitle>
        <CardDescription>
          {subscription?.tier === 'premium' 
            ? 'You currently have premium access' 
            : 'Upgrade to premium for unlimited meal plans'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscription?.tier === 'premium' ? (
          <div className="space-y-2">
            <p className="text-sm">Your premium subscription is active.</p>
            {subscription?.endDate && (
              <p className="text-sm text-muted-foreground">
                Next billing date: {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Premium Plan</h3>
                <p className="text-sm text-muted-foreground">Unlimited meal plans and AI-powered recommendations</p>
              </div>
              <p className="text-xl font-bold">$9.99/mo</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li>✓ Unlimited meal plan generation</li>
              <li>✓ Save and manage meal plans</li>
              <li>✓ AI-powered recipe recommendations</li>
              <li>✓ Priority support</li>
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {subscription?.tier === 'premium' ? (
          <Button 
            variant="outline" 
            onClick={() => cancelSubscription()}
            className="w-full"
          >
            Cancel Subscription
          </Button>
        ) : (
          <Button 
            onClick={() => createCheckoutSession()} 
            className="w-full"
          >
            Upgrade to Premium
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
