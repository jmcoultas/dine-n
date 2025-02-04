import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { useUser, type AuthUser, type RequestResult } from '../hooks/use-user';
import { useQueryClient } from '@tanstack/react-query';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { login, register } = useUser();
  const queryClient = useQueryClient();

  const handleSubmit = async (data: { email: string; password: string; name?: string }) => {
    try {
      setError(undefined);
      const result = mode === 'login' 
        ? await login({ email: data.email, password: data.password })
        : await register({ email: data.email, password: data.password });
      
      if (result.ok && result.user) {
        queryClient.setQueryData(['user'], result.user);
        navigate('/');
      } else if (!result.ok) {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
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
    </div>
  );
} 