import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { AuthForm } from './AuthForm';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

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
      } 
      // When in register mode and password exists (for complete-signup)
      else if (mode === 'register' && data.password) {
        const result = await register({ 
          email: data.email, 
          password: data.password,
          ...(data.name ? { name: data.name } : {})
        });
        
        if (result.ok && result.user) {
          queryClient.setQueryData(['user'], result.user);
          setLocation('/');
        } else if (!result.ok) {
          setError(result.message);
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