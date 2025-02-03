import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";

interface AuthUser extends Omit<User, 'password_hash'> {
  firebaseUid: string;
}

interface AuthCredentials {
  email: string;
  password: string;
}

async function syncUserWithServer(firebaseUser: FirebaseUser): Promise<AuthUser> {
  const idToken = await firebaseUser.getIdToken();
  
  const response = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to sync user with server');
  }

  return response.json();
}

async function fetchUser(): Promise<AuthUser | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    return await syncUserWithServer(currentUser);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

export function useUser() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const { data: user } = useQuery<AuthUser | null>({
    queryKey: ['user', firebaseUser?.uid],
    queryFn: fetchUser,
    enabled: !!firebaseUser,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: AuthCredentials) => {
      const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password);
      return syncUserWithServer(fbUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: AuthCredentials) => {
      const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password);
      return syncUserWithServer(fbUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      const provider = new GoogleAuthProvider();
      const { user: fbUser } = await signInWithPopup(auth, provider);
      return syncUserWithServer(fbUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut(auth);
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return {
    user,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    login: loginMutation.mutateAsync,
    loginWithGoogle: googleLoginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}
