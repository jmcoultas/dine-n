import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from "lucide-react";

export function SubscriptionSuccess() {
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  const userId = params.get('user_id');

  useEffect(() => {
    if (!userId) {
      console.error('No user ID found in redirect URL');
      setLocation('/');
      return;
    }

    const checkSubscription = async () => {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();
      
      if (data.isActive) {
        // Subscription is active, invalidate queries and redirect
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        setTimeout(() => setLocation('/'), 1500);
        return true;
      }
      return false;
    };

    // Check subscription status every second for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 10;
    
    const interval = setInterval(async () => {
      attempts++;
      const isActive = await checkSubscription();
      
      if (isActive || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!isActive) {
          console.error('Subscription not activated after maximum attempts');
          setLocation('/');
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [queryClient, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Subscription Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing to our premium plan. Your account has been upgraded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirecting to homepage...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}