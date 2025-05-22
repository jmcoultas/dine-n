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
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [registerAttemptComplete, setRegisterAttemptComplete] = useState(false);

  useEffect(() => {
    // Extract all query parameters for debugging
    const params = new URLSearchParams(search);
    const queryParams: {[key: string]: string} = {};
    params.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Enhanced debugging for mobile/desktop differences
    console.log("Full verification URL:", window.location.href);
    console.log("Search params:", search);
    console.log("Browser user agent:", navigator.userAgent);
    console.log("Verification URL parameters:", queryParams);
    
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    setDebugInfo({
      ...queryParams,
      fullUrl: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: isMobile.toString(),
      searchString: search
    });
    
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
    
    // Be more lenient with mode parameter on mobile
    if (!isMobile && mode !== 'verifyEmail' && mode !== null) {
      // Sometimes Firebase sends the oobCode without the mode parameter
      console.error(`Unexpected mode '${mode}'. Full URL:`, window.location.href);
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
      console.error("No email found in URL or localStorage. Full URL:", window.location.href);
      
      // Ask for email rather than stopping verification
      if (isMobile) {
        setError('Email address not found. Please enter your email to continue or restart the registration process.');
        // In a real implementation, you would add an email input field here
        setIsLoading(false);
        return;
      } else {
        setError('Email address not found. Please restart the registration process.');
        setIsLoading(false);
        return;
      }
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
          
          // Set debugging info
          setDebugInfo(prev => ({
            ...prev,
            userEmail: user?.email || 'no user',
            emailVerified: user?.emailVerified ? 'true' : 'false',
            authState: user ? 'signed in' : 'not signed in',
          }));
          
          if (user && user.emailVerified) {
            console.log("User is verified, proceeding to create user in database");
            
            // Create the user in the native database to prevent limbo state
            try {
              // Get the Firebase ID token to authenticate the request
              console.log("Getting Firebase ID token...");
              const idToken = await user.getIdToken(true); // Force refresh
              console.log("Firebase ID token obtained");
              
              // We don't know the final password yet, but we'll create the user record
              // The password will be updated later when the user completes signup
              console.log("Sending partial registration request to backend");
              
              // Make API call in a robust way with timeouts and retries
              let apiCallSuccessful = false;
              let attempts = 0;
              const maxAttempts = 3;
              
              while (!apiCallSuccessful && attempts < maxAttempts) {
                attempts++;
                try {
                  console.log(`API call attempt ${attempts}/${maxAttempts}...`);
                  
                  // Set a timeout for the fetch request
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                  
                  const response = await fetch('/api/register/partial', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Firebase-Token': idToken,
                    },
                    body: JSON.stringify({
                      email: user.email,
                    }),
                    signal: controller.signal
                  });
                  
                  clearTimeout(timeoutId);
                  
                  // Get the response as text first for debugging
                  const responseText = await response.text();
                  console.log(`API response (text): ${responseText}`);
                  
                  // Parse it as JSON if possible
                  let responseData;
                  try {
                    responseData = JSON.parse(responseText);
                  } catch (e) {
                    console.error("Failed to parse response as JSON:", e);
                    responseData = { error: "Invalid JSON response", text: responseText };
                  }
                  
                  setApiResponse(responseData);
                  console.log('API response (parsed):', responseData);
                  
                  // Consider the call successful if status is 200, even if there was an error
                  // This allows the user to continue to the password setup
                  if (response.ok) {
                    console.log('API call succeeded with status:', response.status);
                    setDebugInfo(prev => ({
                      ...prev, 
                      apiSuccess: JSON.stringify(responseData),
                      apiStatus: response.status.toString(), 
                      userId: responseData.user_id || 'not returned',
                      attempt: attempts.toString()
                    }));
                    apiCallSuccessful = true;
                  } else {
                    console.error('Failed to create partial user record:', responseData);
                    setDebugInfo(prev => ({
                      ...prev, 
                      apiError: JSON.stringify(responseData),
                      apiStatus: response.status.toString(),
                      attempt: attempts.toString()
                    }));
                    // If it's a server error, retry
                    if (response.status >= 500) {
                      console.log("Server error, will retry...");
                      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                      continue;
                    }
                  }
                } catch (fetchError) {
                  console.error(`API call attempt ${attempts} failed:`, fetchError);
                  setDebugInfo(prev => ({
                    ...prev, 
                    apiFetchError: fetchError instanceof Error ? fetchError.message : String(fetchError),
                    attempt: attempts.toString()
                  }));
                  // Wait before retrying
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
              
              setRegisterAttemptComplete(true);
              
              if (!apiCallSuccessful) {
                console.error(`Failed to create partial user record after ${maxAttempts} attempts`);
                setDebugInfo(prev => ({
                  ...prev,
                  finalStatus: `Failed after ${maxAttempts} attempts`
                }));
                // We'll continue to the password step anyway
              } else {
                console.log('Successfully created partial user record after attempts:', attempts);
                setDebugInfo(prev => ({
                  ...prev,
                  finalStatus: `Success after ${attempts} attempts`
                }));
              }
            } catch (dbError) {
              console.error('Error creating user in database:', dbError);
              setDebugInfo(prev => ({
                ...prev, 
                dbError: dbError instanceof Error ? dbError.message : String(dbError)
              }));
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
          } else if (user) {
            console.log("User exists but is not verified");
            setError('Email verification status could not be confirmed. Please contact support.');
            setIsLoading(false);
          } else {
            console.log("No user found after verification");
            // If we have the email, we can still try to proceed
            if (email) {
              // On mobile, we might need to manually sign in the user first
              if (isMobile) {
                try {
                  console.log("Mobile user with no session but has oobCode - attempting to recover");
                  
                  // Try to create user record anyway even without Firebase auth
                  try {
                    console.log("Sending partial registration request without Firebase token");
                    const response = await fetch('/api/register/partial', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        email: email,
                        // We don't have a token but include verification info
                        verified_by_oobcode: oobCode
                      })
                    });
                    
                    const responseText = await response.text();
                    console.log(`Mobile fallback API response: ${responseText}`);
                    
                    let responseData;
                    try {
                      responseData = JSON.parse(responseText);
                      setApiResponse(responseData);
                    } catch (e) {
                      console.error("Failed to parse response as JSON:", e);
                    }
                  } catch (mobileApiError) {
                    console.error("Error in mobile fallback API call:", mobileApiError);
                  }
                } catch (mobileError) {
                  console.error("Error in mobile fallback flow:", mobileError);
                }
              }
              
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
              {registerAttemptComplete && !apiResponse?.user_id && (
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
          
          {/* Show debug information in development or any environment for troubleshooting */}
          {(import.meta.env.DEV || true) && (
            <Alert className="mt-4">
              <AlertDescription>
                <details>
                  <summary className="cursor-pointer font-semibold">Debug Information</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-[200px]">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                  {apiResponse && (
                    <>
                      <summary className="cursor-pointer font-semibold mt-2">API Response</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-[200px]">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </>
                  )}
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