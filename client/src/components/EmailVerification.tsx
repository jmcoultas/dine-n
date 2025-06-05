import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { auth, isEmailVerified } from '../lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { applyActionCode, onAuthStateChanged } from 'firebase/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EmailVerification() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerAttemptComplete, setRegisterAttemptComplete] = useState(false);

  useEffect(() => {
    // Extract all query parameters
    const params = new URLSearchParams(search);
    
    // Enhanced logging for mobile/desktop differences
    console.log("Full verification URL:", window.location.href);
    console.log("Search params:", search);
    console.log("Browser user agent:", navigator.userAgent);
    
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Extract specific parameters we need
    // Mobile might use 'apiKey' and 'oobCode' in different formats or positions
    const oobCode = params.get('oobCode') || 
                    params.get('code') || 
                    window.location.href.match(/oobCode=([^&]+)/)?.[1];
                    
    const mode = params.get('mode') || 
                (window.location.href.includes('verifyEmail') ? 'verifyEmail' : null);
                
    const email = params.get('email') || 
                  localStorage.getItem('emailForSignup') ||
                  params.get('continueUrl')?.match(/email=([^&]+)/)?.[1];
    
    console.log("Email verification component loaded with:", { 
      oobCode: oobCode ? `${oobCode.substring(0, 5)}...` : null, 
      mode, 
      email,
      search,
      isMobile
    });
    
    if (!oobCode) {
      console.error("Missing verification code. Full URL:", window.location.href);
      setError('Missing verification code (oobCode). The verification link may be incomplete or was modified by your email provider.');
      setIsLoading(false);
      return;
    }
    
    const verifyEmail = async () => {
      try {
        console.log("Attempting to apply verification code...");
        
        // Apply the action code to verify the email
        await applyActionCode(auth, oobCode);
        console.log("Action code applied successfully");
        
        // On mobile, we might need to manually reload auth state 
        if (isMobile) {
          console.log("Running on mobile, refreshing auth state...");
          try {
            await auth.currentUser?.reload();
          } catch (refreshError) {
            console.warn("Failed to refresh user state:", refreshError);
          }
        }
        
        // Check auth state to confirm verification status
        onAuthStateChanged(auth, async (user) => {
          console.log("Auth state changed. User:", user ? `${user.email} (verified: ${user.emailVerified})` : "No user");
          
          if (user && user.emailVerified) {
            console.log("User is verified, creating database record...");
            
            try {
              // Create user record in database with retry logic
              let attempts = 0;
              const maxAttempts = 3;
              let apiCallSuccessful = false;
              
              while (attempts < maxAttempts && !apiCallSuccessful) {
                attempts++;
                console.log(`Attempt ${attempts} to create user record...`);
                
                try {
                  const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      email: user.email,
                      name: user.displayName || email?.split('@')[0] || 'User',
                      isPartialRegistration: true
                    }),
                  });

                  if (response.ok) {
                    const result = await response.json();
                    console.log('Successfully created partial user record:', result);
                    apiCallSuccessful = true;
                  } else {
                    const errorText = await response.text();
                    console.error(`API call failed (attempt ${attempts}):`, response.status, errorText);
                    
                    if (attempts < maxAttempts) {
                      console.log(`Retrying in ${attempts * 1000}ms...`);
                      await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                    }
                  }
                } catch (fetchError) {
                  console.error(`Network error on attempt ${attempts}:`, fetchError);
                  
                  if (attempts < maxAttempts) {
                    console.log(`Retrying in ${attempts * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                  }
                }
              }
              
              if (!apiCallSuccessful) {
                console.error(`Failed to create partial user record after ${maxAttempts} attempts`);
                // We'll continue to the password step anyway
              } else {
                console.log('Successfully created partial user record after attempts:', attempts);
              }
            } catch (dbError) {
              console.error('Error creating user in database:', dbError);
              setRegisterAttemptComplete(true);
              // We'll continue to the password step anyway
            }
            
            setIsVerified(true);
            
            // Clear URL parameters before redirect
            if (window.history && window.history.pushState) {
              window.history.pushState({}, document.title, '/auth/verify-email');
            }
            
            // Redirect to complete signup after a short delay
            setTimeout(() => {
              console.log("Redirecting to complete-signup page");
              setLocation('/auth/complete-signup');
            }, 2000);
          } else {
            console.log("User not verified or not signed in");
            setError('Email verification failed. Please try again or contact support.');
            setIsLoading(false);
          }
        });
      } catch (error) {
        console.error('Error verifying email:', error);
        setError(error instanceof Error ? error.message : 'Failed to verify email. The link may be expired or invalid.');
        setIsLoading(false);
      }
    };
    
    verifyEmail();
  }, [search, setLocation]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            {isVerified ? 'Email successfully verified!' : 'Verification Status'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isVerified ? (
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p>Your email has been verified successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting you to complete your registration...</p>
              {registerAttemptComplete && (
                <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-800">
                    Note: We recommend completing the password setup to ensure your account is fully activated.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p>{error || 'The verification link is invalid or has expired.'}</p>
              <p className="text-sm text-muted-foreground">Please try registering again to receive a new verification link.</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          <Button 
            onClick={() => setLocation('/auth')}
            variant={isVerified ? "outline" : "default"}
          >
            {isVerified ? "Go to Login" : "Return to Login"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 