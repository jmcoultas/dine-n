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
  const [debugInfo, setDebugInfo] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Extract all query parameters for debugging
    const params = new URLSearchParams(search);
    const queryParams: {[key: string]: string} = {};
    params.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Log query parameters for debugging
    console.log("Verification URL parameters:", queryParams);
    setDebugInfo(queryParams);
    
    // Extract specific parameters we need
    const oobCode = params.get('oobCode');
    const mode = params.get('mode');
    const email = params.get('email') || localStorage.getItem('emailForSignup');
    
    console.log("Email verification component loaded with:", { oobCode: oobCode?.substring(0, 5) + "...", mode, email });
    
    if (!oobCode) {
      setError('Missing verification code (oobCode). The verification link may be incomplete.');
      setIsLoading(false);
      return;
    }
    
    if (mode !== 'verifyEmail' && mode !== null) {
      // Sometimes Firebase sends the oobCode without the mode parameter
      setError(`Unexpected verification mode: ${mode}. Expected: verifyEmail`);
      setIsLoading(false);
      return;
    }
    
    // Store the email for later use (if provided in the URL)
    if (email) {
      // Make sure to save the email to localStorage
      console.log("Saving email to localStorage:", email);
      localStorage.setItem('emailForSignup', email);
    } else {
      console.error("No email found in URL or localStorage");
      setError('Email address not found. Please restart the registration process.');
      setIsLoading(false);
      return;
    }
    
    const verifyEmail = async () => {
      try {
        console.log("Attempting to apply verification code...");
        
        // Apply the action code to verify the email
        await applyActionCode(auth, oobCode);
        console.log("Action code applied successfully");
        
        // Check auth state to confirm verification status
        onAuthStateChanged(auth, async (user) => {
          console.log("Auth state changed. User:", user ? `${user.email} (verified: ${user.emailVerified})` : "No user");
          
          if (user && user.emailVerified) {
            console.log("User is verified, proceeding to create user in database");
            
            // Create the user in the native database to prevent limbo state
            try {
              // Get the Firebase ID token to authenticate the request
              const idToken = await user.getIdToken();
              
              // We don't know the final password yet, but we'll create the user record
              // The password will be updated later when the user completes signup
              const response = await fetch('/api/register/partial', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Firebase-Token': idToken,
                },
                body: JSON.stringify({
                  email: user.email,
                }),
              });
              
              if (!response.ok) {
                console.error('Failed to create partial user record:', await response.text());
                // We'll continue to the password step anyway
              } else {
                console.log('Successfully created partial user record');
              }
            } catch (dbError) {
              console.error('Error creating user in database:', dbError);
              // We'll continue to the password step anyway
            }
            
            setIsVerified(true);
            
            // Clear URL parameters before redirect
            if (window.history && window.history.pushState) {
              window.history.pushState({}, document.title, '/auth/verify-email');
            }
            
            // Redirect to complete signup after a short delay
            setTimeout(() => {
              setLocation('/auth/complete-signup');
            }, 2000);
          } else if (user) {
            console.log("User exists but is not verified");
            setError('Email verification status could not be confirmed. Please contact support.');
            setIsLoading(false);
          } else {
            console.log("No user found after verification");
            // If we have the email, we can still try to proceed
            if (email) {
              setIsVerified(true);
              
              // Clear URL parameters before redirect
              if (window.history && window.history.pushState) {
                window.history.pushState({}, document.title, '/auth/verify-email');
              }
              
              setTimeout(() => {
                setLocation('/auth/complete-signup');
              }, 2000);
            } else {
              setError('User session not found. Please try logging in or restart the registration process.');
              setIsLoading(false);
            }
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
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p>{error || 'The verification link is invalid or has expired.'}</p>
              <p className="text-sm text-muted-foreground">Please try registering again to receive a new verification link.</p>
            </div>
          )}
          
          {/* Show debug information in development */}
          {import.meta.env.DEV && Object.keys(debugInfo).length > 0 && (
            <Alert className="mt-4">
              <AlertDescription>
                <details>
                  <summary className="cursor-pointer font-semibold">Debug Information</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-[200px]">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center gap-4">
          <Button 
            onClick={() => setLocation('/auth')}
            variant={isVerified ? "outline" : "default"}
          >
            {isVerified ? "Go to Login" : "Return to Login"}
          </Button>
          
          {!isVerified && (
            <Button 
              onClick={() => window.location.href = '/firebase-diagnostic'}
              variant="secondary"
            >
              Run Diagnostics
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 