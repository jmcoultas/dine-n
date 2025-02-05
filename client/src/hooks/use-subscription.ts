import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { useToast } from '@/components/ui/use-toast';

// Using import.meta.env for Vite environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface SubscriptionStatus {
  isActive: boolean;
  tier: 'free' | 'premium';
  endDate?: Date;
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string; // Added URL to the response type
}

export function useSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch subscription status
  const { data: subscription, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/status');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      return response.json() as Promise<SubscriptionStatus>;
    },
    // Increased staleTime to 5 minutes and disabled refetch on window focus to prevent constant polling
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Create checkout session mutation
  const createCheckoutSessionMutation = useMutation<
    CheckoutSessionResponse,
    Error,
    void,
    unknown
  >({
    mutationFn: async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/subscription/create-checkout', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const data = await response.json();
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: async (data) => {
      // Instead of using Stripe's redirectToCheckout, use the URL from the session
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL provided');
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start subscription process",
        variant: "destructive",
      });
    }
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({
        title: "Success",
        description: "Your subscription has been cancelled",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  return {
    subscription,
    isLoading: isLoading || isLoadingStatus,
    createCheckoutSession: createCheckoutSessionMutation.mutateAsync,
    cancelSubscription: cancelSubscriptionMutation.mutateAsync,
  };
}