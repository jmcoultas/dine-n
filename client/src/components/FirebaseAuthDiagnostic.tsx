import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function FirebaseAuthDiagnostic() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('emailPassword');

  const testEmailPassword = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      // First try to create a user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setResult({
          success: true,
          message: `Successfully created user with email: ${userCredential.user.email}. User ID: ${userCredential.user.uid}`
        });
      } catch (error: any) {
        // If user already exists, try to sign in
        if (error.code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          setResult({
            success: true,
            message: `Successfully signed in with email: ${userCredential.user.email}. User ID: ${userCredential.user.uid}`
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error: ${error.code} - ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testEmailLink = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/verify-email?email=${email}`,
        handleCodeInApp: true
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      setResult({
        success: true,
        message: `Successfully sent email link to ${email}. Please check your inbox.`
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error: ${error.code} - ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testEmailVerification = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      // First create a user with the provided credentials
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Send verification email
        await sendEmailVerification(userCredential.user, {
          url: `${window.location.origin}/auth/verify-email?email=${email}`,
          handleCodeInApp: true
        });
        
        setResult({
          success: true,
          message: `Successfully created user and sent verification email to ${email}. Please check your inbox.`
        });
      } catch (error: any) {
        // If user already exists, try to sign in and then send verification email
        if (error.code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          if (!userCredential.user.emailVerified) {
            await sendEmailVerification(userCredential.user, {
              url: `${window.location.origin}/auth/verify-email?email=${email}`,
              handleCodeInApp: true
            });
            setResult({
              success: true,
              message: `User already exists. Sent verification email to ${email}. Please check your inbox.`
            });
          } else {
            setResult({
              success: true,
              message: `User already exists and is verified: ${userCredential.user.email}`
            });
          }
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error: ${error.code} - ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testPasswordReset = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResult({
        success: true,
        message: `Successfully sent password reset email to ${email}. Please check your inbox.`
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error: ${error.code} - ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Firebase Auth Diagnostic</CardTitle>
        <CardDescription>
          Test different Firebase authentication methods to pinpoint issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password (min 6 characters)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="emailPassword">Email/Password</TabsTrigger>
              <TabsTrigger value="emailVerification">Email Verification</TabsTrigger>
              <TabsTrigger value="emailLink">Email Link</TabsTrigger>
              <TabsTrigger value="passwordReset">Password Reset</TabsTrigger>
            </TabsList>
            
            <TabsContent value="emailPassword" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tests creating or signing in a user with email and password
              </p>
              <Button 
                onClick={testEmailPassword} 
                disabled={isLoading || !email || !password}
                className="w-full"
              >
                {isLoading ? "Testing..." : "Test Email/Password Auth"}
              </Button>
            </TabsContent>

            <TabsContent value="emailVerification" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tests creating a user and sending a verification email
              </p>
              <Button 
                onClick={testEmailVerification} 
                disabled={isLoading || !email || !password}
                className="w-full"
              >
                {isLoading ? "Testing..." : "Test Email Verification"}
              </Button>
            </TabsContent>
            
            <TabsContent value="emailLink" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tests sending an email with a sign-in link (passwordless)
              </p>
              <Button 
                onClick={testEmailLink} 
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading ? "Testing..." : "Test Email Link Auth"}
              </Button>
            </TabsContent>
            
            <TabsContent value="passwordReset" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tests sending a password reset email
              </p>
              <Button 
                onClick={testPasswordReset} 
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading ? "Testing..." : "Test Password Reset"}
              </Button>
            </TabsContent>
          </Tabs>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "bg-green-50 border-green-200" : ""}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          Firebase Auth Version: 9.x
        </div>
        <div className="text-xs text-muted-foreground">
          Auth Domain: {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "Not configured"}
        </div>
      </CardFooter>
    </Card>
  );
} 