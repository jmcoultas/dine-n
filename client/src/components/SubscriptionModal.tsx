import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

export function SubscriptionModal({ open, onOpenChange, feature }: SubscriptionModalProps) {
  const { createCheckoutSession, isLoading } = useSubscription();

  const handleUpgrade = async () => {
    try {
      await createCheckoutSession();
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  // Prevent closing the modal by clicking outside or pressing escape
  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing through the Cancel button
    if (newOpen === false && !isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent className="sm:max-w-md z-50" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Premium Feature</DialogTitle>
          <DialogDescription>
            {feature ? `${feature} is` : 'This feature is'} only available with a premium subscription
          </DialogDescription>
        </DialogHeader>
        <Card className="mt-4 border-none shadow-none">
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Premium Plan</h3>
                <p className="text-sm text-muted-foreground">Unlimited access to all features</p>
              </div>
              <p className="text-xl font-bold">$9.99/mo</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li>✓ Unlimited meal plan generation</li>
              <li>✓ Save and manage meal plans</li>
              <li>✓ AI-powered recipe recommendations</li>
              <li>✓ Priority support</li>
            </ul>
          </CardContent>
          <CardFooter className="px-0 flex gap-2">
            <Button 
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpgrade}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upgrade to Premium
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}