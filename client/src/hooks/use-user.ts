import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { initializeFirebaseAuth, createFirebaseUser, signInWithEmail } from '../lib/firebase';

interface InsertUser {
  email: string;
  password: string;
  name?: string;
}

// Define a proper user type that includes Firebase token
export interface AuthUser extends Omit<User, 'password_hash'> {
  subscription_status: string;
  subscription_tier: string;
  meal_plans_generated: number;
  firebaseToken?: string;
}

export type RequestResult = {
  ok: true;
  user?: AuthUser;
} | {
  ok: false;
  message: string;
  type?: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: InsertUser
): Promise<RequestResult> {
  try {
    let firebaseToken = null;

    // Handle Firebase auth for registration only, not login
    if (body?.email && body?.password && url.includes('/register')) {
      try {
        const { idToken } = await createFirebaseUser(body.email, body.password);
        firebaseToken = idToken;
      } catch (firebaseError: any) {
        // Handle Firebase-specific errors
        const errorMessage = firebaseError.code ? 
          firebaseError.code.replace('auth/', '').replace(/-/g, ' ') : 
          firebaseError.message;
        return { ok: false, message: errorMessage };
      }
    }

    // Add the Firebase token to the request if available
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (firebaseToken) {
      headers["Firebase-Token"] = firebaseToken;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      // Try to parse JSON error response first
      try {
        const errorData = await response.json();
        return { 
          ok: false as const, 
          message: errorData.message || errorData.error || 'An error occurred',
          type: errorData.type
        };
      } catch {
        // Fallback to text if JSON parsing fails
        const message = await response.text();
        return { ok: false, message };
      }
    }

    const data = await response.json();
    
    // Initialize Firebase auth if token is present
    if (data.user?.firebaseToken) {
      await initializeFirebaseAuth(data.user.firebaseToken);
    }

    return { ok: true, user: data.user };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

// Separate login function that bypasses Firebase
async function handleLogin(credentials: { email: string; password: string }): Promise<RequestResult> {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(credentials),
      credentials: "include",
    });

    if (!response.ok) {
      // Try to parse JSON error response first
      try {
        const errorData = await response.json();
        return { 
          ok: false as const, 
          message: errorData.message || errorData.error || 'Login failed',
          type: errorData.type
        };
      } catch {
        // Fallback to text if JSON parsing fails
        const message = await response.text();
        return { ok: false, message };
      }
    }

    const data = await response.json();
    
    // Initialize Firebase auth if token is present
    if (data.user?.firebaseToken) {
      await initializeFirebaseAuth(data.user.firebaseToken);
    }

    return { ok: true, user: data.user };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

export type UserQueryResult = UseQueryResult<AuthUser | null, Error> & {
  login: (credentials: { email: string; password: string }) => Promise<RequestResult>;
  register: (credentials: { email: string; password: string }) => Promise<RequestResult>;
};

export function useUser(): UserQueryResult {
  const queryClient = useQueryClient();
  const query = useQuery<AuthUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 300000, // Consider data fresh for 5 minutes
    retry: false, // Don't retry on auth failures
  });

  const loginMutation = useMutation<RequestResult, Error, { email: string; password: string }>({
    mutationFn: async (credentials) => {
      const result = await handleLogin(credentials);
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const registerMutation = useMutation<RequestResult, Error, { email: string; password: string }>({
    mutationFn: async (credentials) => {
      const result = await handleRequest('/api/register', 'POST', credentials);
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    ...query,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<RequestResult, Error, void>({
    mutationFn: async () => {
      const result = await handleRequest('/api/logout', 'POST');
      if (!result.ok) {
        throw new Error(result.message);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
