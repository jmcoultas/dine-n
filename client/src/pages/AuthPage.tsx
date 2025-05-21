import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useLocation, useSearch } from "wouter";
import { AuthFormWrapper } from "@/components/AuthFormWrapper";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: user } = useUser();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [newPassword, setNewPassword] = useState('');
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [isValidCode, setIsValidCode] = useState(false);
  const search = useSearch();

  // Check for tab parameter and password reset mode/code
  useEffect(() => {
    const params = new URLSearchParams(search);
    const mode = params.get('mode');
    const code = params.get('oobCode');
    const tab = params.get('tab');

    // Set active tab if specified in URL
    if (tab === 'register') {
      setActiveTab('register');
    }

    // Firebase redirects with just the oobCode, so we need to check for that
    if ((mode === 'resetPassword' && code) || (!mode && code)) {
      setOobCode(code);
      // Verify the code is valid
      verifyPasswordResetCode(auth, code)
        .then(() => setIsValidCode(true))
        .catch((error) => {
          console.error('Invalid or expired code:', error);
          toast({
            title: "Error",
            description: "The password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
        });
    }
  }, [search, toast]);

  // Handle password reset confirmation
  const handlePasswordReset = async () => {
    if (!oobCode || !newPassword) return;

    setIsLoading(true);
    try {
      console.log("Starting password reset process");
      // Get the email from the reset code
      const email = await verifyPasswordResetCode(auth, oobCode);
      console.log("Email retrieved:", email);
      
      // First reset the password in Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);
      console.log("Firebase password reset successful");
      
      // Then update the password in our database
      try {
        console.log("Updating password in database");
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            newPassword,
          }),
        });
        
        console.log("Database response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error("Database update failed:", errorData);
          throw new Error(`Failed to update password in database: ${errorData.message || 'Unknown error'}`);
        }
        
        console.log("Password reset complete");
        toast({
          title: "Success",
          description: "Your password has been reset successfully. Please log in with your new password.",
        });
        
        // Clear the URL parameters and redirect to auth page with login tab active
        window.history.replaceState({}, '', '/auth');
        setActiveTab('login');
        
        // Remove the reset code and valid code state to show the login form
        setOobCode(null);
        setIsValidCode(false);
      } catch (dbError) {
        console.error("Database update error:", dbError);
        // Still show success since Firebase password was updated
        toast({
          title: "Partial Success",
          description: "Your password was reset but there was an issue syncing with our system. You may need to use the 'Forgot Password' option again if you have trouble logging in.",
          variant: "destructive",
        });
        
        // Clear the URL parameters and redirect to auth page with login tab active
        window.history.replaceState({}, '', '/auth');
        setActiveTab('login');
        
        // Remove the reset code and valid code state to show the login form
        setOobCode(null);
        setIsValidCode(false);
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Show password reset form if we have a valid reset code
  if (oobCode && isValidCode) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Please enter your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePasswordReset();
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container relative flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900/50" />
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://res.cloudinary.com/dxiknlpty/image/upload/v1738681929/cld-sample-4.jpg')`
          }}
        />
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to Dine-N
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account or create a new one
            </p>
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuthFormWrapper initialMode="login" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Register</CardTitle>
                  <CardDescription>
                    Create a new account to get started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuthFormWrapper initialMode="register" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}