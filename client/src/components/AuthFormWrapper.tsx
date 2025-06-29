import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { AuthForm } from './AuthForm';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ToastAction } from '@/components/ui/toast';

interface AuthFormWrapperProps {
  initialMode?: 'login' | 'register';
}

export function AuthFormWrapper({ initialMode = 'login' }: AuthFormWrapperProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [error, setError] = useState<string | undefined>(undefined);
  const { login, register } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Handle limbo state recovery
  const handleLimboRecovery = async (email: string) => {
    try {
      const response = await fetch('/api/auth/resolve-limbo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.resolved) {
        toast({
          title: "Account Recovered",
          description: data.next_step || "Your account has been recovered. You can now reset your password.",
          variant: "default",
        });
      } else {
        const recommendation = data.recommendations?.[data.analysis?.limbo_state];
        toast({
          title: "Account Status",
          description: recommendation || "Please try using the password reset option.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Limbo recovery failed:', error);
      toast({
        title: "Recovery Failed",
        description: "Unable to recover account automatically. Please try the password reset option.",
        variant: "destructive",
      });
    }
  };

  // This handler accepts optional password but enforces it as required when needed
  const handleSubmit = async (data: { email: string; password?: string; name?: string }) => {
    try {
      setError(undefined);

      // For login and regular registration, password is required
      if (!data.password && mode !== 'register') {
        setError("Password is required");
        toast({
          title: "Error",
          description: "Password is required",
          variant: "destructive",
        });
        return;
      }

      // When we reach this point in login mode, we can be sure password exists
      if (mode === 'login' && data.password) {
        try {
          const result = await login({ 
            email: data.email, 
            password: data.password 
          });
          
          if (result.ok && result.user) {
            queryClient.setQueryData(['user'], result.user);
            setLocation('/');
          } else if (!result.ok) {
            setError(result.message);
          }
        } catch (err) {
          // Handle specific authentication errors
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          
          // Show toast for better user experience
          toast({
            title: "Login Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } 
      // When in register mode and password exists (for complete-signup)
      else if (mode === 'register' && data.password) {
        try {
          const result = await register({ 
            email: data.email, 
            password: data.password,
            ...(data.name ? { name: data.name } : {})
          });
          
          if (result.ok && result.user) {
            queryClient.setQueryData(['user'], result.user);
            
            // Show success message if recovered from limbo
            if ((result as any).recovered_from_limbo) {
              toast({
                title: "Account Recovered",
                description: "Your account has been successfully recovered and synced!",
                variant: "default",
              });
            }
            
            setLocation('/');
          } else if (!result.ok) {
            setError(result.message);
            
                         // Handle specific registration errors with recovery suggestions
             if (result.type === 'DUPLICATE_EMAIL') {
               toast({
                 title: "Account Already Exists",
                 description: result.suggestion || "Try using the password reset option if you can't access your account.",
                 variant: "destructive",
                 action: (
                   <ToastAction 
                     onClick={() => handleLimboRecovery(data.email)}
                     altText="Try Password Reset"
                   >
                     Try Password Reset
                   </ToastAction>
                 )
               });
             } else if (result.type === 'FIREBASE_ERROR') {
               toast({
                 title: "Registration Issue",
                 description: result.suggestion || result.message,
                 variant: "destructive",
                 action: result.suggestion ? (
                   <ToastAction 
                     onClick={() => handleLimboRecovery(data.email)}
                     altText="Get Help"
                   >
                     Get Help
                   </ToastAction>
                 ) : undefined
               });
             }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Registration failed';
          setError(errorMessage);
          
          toast({
            title: "Registration Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
      // Register without password handled by the AuthForm component directly
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="w-full">
      <AuthForm
        mode={mode}
        onSubmit={handleSubmit}
        error={error}
      />
      
      <div className="mt-4 text-center">
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
} 