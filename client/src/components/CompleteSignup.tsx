import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { completeEmailSignup } from '../lib/firebase';
import { CompleteSignupForm } from './CompleteSignupForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../hooks/use-user';

export default function CompleteSignup() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Redirect handler to ensure we only redirect once
  const redirectToHome = useCallback(() => {
    console.log("Redirecting to home page");
    
    // Clear any query parameters from URL to prevent verification router from redirecting back
    if (window.history && window.history.pushState) {
      // Replace the current URL with one that has no query parameters
      window.history.pushState({}, document.title, '/');
    }
    
    // Small delay to allow React to finish any rendering
    setTimeout(() => {
      setLocation('/');
    }, 100);
  }, [setLocation]);

  useEffect(() => {
    // Get email from localStorage - should have been set during verification
    const emailFromStorage = localStorage.getItem('emailForSignup');
    console.log("Attempting to retrieve email from localStorage:", emailFromStorage);
    
    if (!emailFromStorage) {
      console.error("Email not found in localStorage during CompleteSignup");
      
      // Try to get the current user's email from Firebase if they're logged in
      // This adds resilience if localStorage was cleared
      import('../lib/firebase').then(({ auth }) => {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email) {
          console.log("Found email from current user:", currentUser.email);
          setEmail(currentUser.email);
          localStorage.setItem('emailForSignup', currentUser.email);
          setIsLoading(false);
        } else {
          setError('Email not found. Please start the registration process again.');
          setIsLoading(false);
        }
      });
      return;
    }
    
    setEmail(emailFromStorage);
    setIsLoading(false);
  }, []);

  const handleCompleteSignup = async (data: { email: string; password: string; confirmPassword: string; name: string }) => {
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    // Validate passwords match (extra validation)
    if (data.password !== data.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setIsLoading(true);
      setError(null);
      
      console.log("Starting signup completion process");
      
      // Call the updated completeEmailSignup function to update the password
      const { user, idToken } = await completeEmailSignup(data.email, data.password);
      console.log("Successfully completed Firebase signup, contacting backend");
      
      // Show the success screen
      setRegistrationSuccess(true);
      
      // Make a call to your backend to complete the registration
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Firebase-Token': idToken,
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          password: data.password // Send the new password to update in the backend
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error('Failed to register with the server: ' + errorText);
      }

      console.log("Successfully registered with backend");
      const result = await response.json();
      
      // Clear the stored email
      localStorage.removeItem('emailForSignup');
      localStorage.removeItem('tempAuthPassword');
      
      // Set a flag to indicate registration was completed successfully
      // This will be used to prevent unwanted redirects back to verification
      localStorage.setItem('registrationCompleted', 'true');
      
      // Store the timestamp of when registration was completed
      localStorage.setItem('registrationTimestamp', Date.now().toString());
      
      // Update the user state
      queryClient.setQueryData<AuthUser | null>(['user'], result.user || null);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      toast({
        title: "Success",
        description: "Your account has been created successfully!",
      });
      
      // Add a longer delay before redirecting to ensure database operations complete
      console.log("Registration complete, waiting for database to update before redirecting...");
      
      // Verify the user data is available before redirecting
      let retryCount = 0;
      const maxRetries = 5;
      const checkUserAndRedirect = async () => {
        try {
          // Check if user data is available in the backend
          const userResponse = await fetch('/api/user', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
          
          if (userResponse.ok) {
            console.log("User data confirmed in backend, safe to redirect");
            // User data confirmed, safe to redirect
            redirectToHome();
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`User data not ready yet, retrying (${retryCount}/${maxRetries})...`);
              // Wait and try again
              setTimeout(checkUserAndRedirect, 500);
            } else {
              console.log("Max retries reached, redirecting anyway");
              // Max retries reached, redirect anyway
              redirectToHome();
            }
          }
        } catch (error) {
          console.error("Error checking user data:", error);
          // If checking fails, just redirect
          redirectToHome();
        }
      };
      
      // Start checking after a short initial delay
      setTimeout(checkUserAndRedirect, 1000);
      
    } catch (error) {
      console.error('Error completing signup:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete registration');
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to complete registration',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  // If showing the registration success screen
  if (registrationSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-md mx-auto">
        <div className="mb-6 relative">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-primary text-2xl">✓</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-3">Registration Complete!</h2>
        <p className="text-muted-foreground mb-6">
          Your account has been created successfully. We're preparing your personalized experience...
        </p>
        <div className="w-full max-w-xs bg-primary/10 rounded-lg p-4">
          <p className="text-sm font-medium">Please don't refresh the page. You'll be redirected automatically in a moment.</p>
        </div>
      </div>
    );
  }

  // If still in loading or submitting state, show loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Registration</CardTitle>
        <CardDescription>
          {email 
            ? "Your email has been verified. Please complete your registration by setting a password."
            : "No email found. Please restart registration."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {email ? (
          <CompleteSignupForm 
            email={email}
            onSubmit={handleCompleteSignup}
            error={error || undefined}
          />
        ) : (
          <div className="text-center p-4">
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => setLocation('/auth')}
              className="text-blue-500 hover:underline"
            >
              Return to login page
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 