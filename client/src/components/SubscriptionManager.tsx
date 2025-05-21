import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function SubscriptionManager() {
  const { subscription, isLoading, createCheckoutSession, cancelSubscription } = useSubscription();
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const queryClient = useQueryClient();

  const handleUpgrade = async () => {
    try {
      await createCheckoutSession();
    } catch (error) {
      console.error('Stripe checkout error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive",
      });
    }
  };

  const handleCancelConfirm = async () => {
    try {
      setIsCancelling(true);
      await cancelSubscription();
      
      // Invalidate and refetch user and subscription queries
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      await queryClient.invalidateQueries({ queryKey: ['subscription'] });
      
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully. Your premium access will end at the end of your current billing period.",
      });
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            {subscription?.isActive
              ? subscription?.isCancelled
                ? "Your premium access will continue until the end of your billing period"
                : "You currently have an active premium subscription"
              : "You are currently on the free plan"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">Current Plan:</span>{" "}
              {subscription?.tier === "premium" ? "Premium" : "Free"}
            </p>
            {subscription?.endDate && (
              <p className="text-sm">
                <span className="font-medium">
                  {subscription?.isCancelled ? "Access Until" : "Renewal Date"}:
                </span>{" "}
                {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            )}
            {subscription?.isCancelled && subscription?.isActive && (
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Your subscription has been cancelled but you still have premium access until the end date.
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          {subscription?.isActive && !subscription?.isCancelled ? (
            <Button
              variant="destructive"
              onClick={() => setShowCancelDialog(true)}
              disabled={isCancelling}
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Subscription
            </Button>
          ) : subscription?.isCancelled ? (
            <Button onClick={handleUpgrade}>Resubscribe</Button>
          ) : (
            <Button onClick={handleUpgrade}>Upgrade to Premium</Button>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your premium subscription? You'll continue to have access to premium features until the end of your current billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}