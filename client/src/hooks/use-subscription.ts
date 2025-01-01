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
  const { mutate: createCheckoutSession } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/subscription/create-checkout', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { sessionId } = await response.json();
        const stripe = await stripePromise;

        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          throw error;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to start subscription process",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Cancel subscription mutation
  const { mutate: cancelSubscription } = useMutation({
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
    createCheckoutSession,
    cancelSubscription,
  };
}