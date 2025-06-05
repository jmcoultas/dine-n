import { useState, useEffect } from 'react';
import { signInWithGoogle, resetPassword, emailSignup } from '../lib/firebase';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface AuthFormProps {
  mode: 'login' | 'register' | 'complete-signup';
  onSubmit: (data: { email: string; password?: string; name?: string }) => Promise<void>;
  error?: string;
  email?: string; // For complete-signup mode
}

export function AuthForm({ mode, onSubmit, error, email: initialEmail }: AuthFormProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(error);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // If email is provided (for complete-signup mode), use it
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    } else if (mode === 'complete-signup') {
      // Try to get email from localStorage if in complete-signup mode
      const savedEmail = localStorage.getItem('emailForSignup');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [initialEmail, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');
    
    // Check terms acceptance for registration
    if (mode === 'register' && !acceptedTerms) {
      setFormError('You must accept the Terms and Conditions to continue');
      setIsLoading(false);
      toast({
        title: "Terms Required",
        description: "Please accept the Terms and Conditions to create an account.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (mode === 'register') {
        // In register mode, only collect email and name, then send verification
        await emailSignup(email);
        setVerificationSent(true);
        toast({
          title: "Verification Email Sent",
          description: "Please check your email to continue registration.",
        });
      } else if (mode === 'login' || mode === 'complete-signup') {
        // For login and complete-signup modes, use the passed onSubmit
        const submitData: { email: string; password?: string; name?: string } = { email };
        
        // Add password for login and complete-signup modes
        submitData.password = password;
        
        // Add name for complete-signup mode
        if (mode === 'complete-signup') {
          submitData.name = name;
        }
        
        await onSubmit(submitData);
        
        // Clear form after successful submission
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Check terms acceptance for registration via Google
    if (mode === 'register' && !acceptedTerms) {
      setFormError('You must accept the Terms and Conditions to continue');
      toast({
        title: "Terms Required",
        description: "Please accept the Terms and Conditions to create an account.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setFormError('');
    
    try {
      const result = await signInWithGoogle();
      queryClient.setQueryData<AuthUser | null>(['user'], result.user || null);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      toast({
        title: "Success",
        description: "Password reset email has been sent",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Display a different form based on the mode
  if (mode === 'register' && verificationSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-6 border border-green-200">
          <h3 className="text-lg font-medium text-green-800 mb-2">Verification Email Sent!</h3>
          <p className="text-green-700">
            We've sent an email to <strong>{email}</strong> with a link to complete your registration.
            Please check your inbox (and spam folder) and click the link to continue.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setVerificationSent(false)}
          className="mt-4"
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(mode === 'register' || mode === 'complete-signup') && (
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
      )}
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={mode === 'complete-signup'} // Email is already verified in this step
        />
      </div>
      
      {mode !== 'register' && (
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      )}

      {/* Terms and Conditions checkbox for registration */}
      {mode === 'register' && (
        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              className="mt-1"
            />
            <div className="grid gap-1.5 leading-none">
              <Label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms and Conditions
                </Link>
              </Label>
              <p className="text-xs text-muted-foreground">
                By creating an account, you acknowledge that you understand our AI-generated content is for informational purposes only and you will exercise your own judgment regarding food safety and dietary decisions.
              </p>
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="text-sm text-red-500">{formError}</div>
      )}

      <div className="space-y-2">
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || (mode === 'register' && !acceptedTerms)}
        >
          {isLoading ? 'Loading...' : 
            mode === 'login' ? 'Sign In' : 
            mode === 'register' ? 'Continue with Email' :
            'Complete Registration'}
        </Button>

        {mode !== 'complete-signup' && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading || (mode === 'register' && !acceptedTerms)}
            >
              {isLoading ? 'Loading...' : 'Google'}
            </Button>
          </>
        )}

        {mode === 'login' && (
          <div className="text-center">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-sm text-muted-foreground hover:text-primary"
              disabled={isLoading}
            >
              Forgot your password?
            </button>
            {resetSent && (
              <p className="text-sm text-green-600 mt-2">
                Password reset email sent!
              </p>
            )}
          </div>
        )}
      </div>
    </form>
  );
} 