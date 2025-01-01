import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from "lucide-react";

export function SubscriptionSuccess() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Invalidate both user and subscription queries to fetch fresh data
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    queryClient.invalidateQueries({ queryKey: ['user'] });

    // Redirect to home page after 3 seconds
    const timer = setTimeout(() => {
      setLocation('/');
    }, 3000);

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