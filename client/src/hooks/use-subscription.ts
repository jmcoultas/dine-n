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

        return response.json();
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
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