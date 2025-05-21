import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQueryClient } from '@tanstack/react-query';

export function SubscriptionCanceled() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(location.split('?')[1]);
  const userId = params.get('user_id');

  useEffect(() => {
    // Refresh user data to ensure authentication state is current
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }

    // Redirect to home page after 5 seconds
    const timer = setTimeout(() => {
      setLocation('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [setLocation, queryClient, userId]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Subscription Canceled</CardTitle>
          <CardDescription>
            Your subscription process was canceled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You can try again whenever you're ready to upgrade to premium.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLocation('/')}
          >
            Return to Homepage
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
