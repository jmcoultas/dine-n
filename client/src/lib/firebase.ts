import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    
    // Send the token to your backend to create/update user
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to authenticate with backend');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function initializeFirebaseAuth(token: string) {
  try {
    await signInWithCustomToken(auth, token);
  } catch (error) {
    console.error('Error initializing Firebase auth:', error);
    throw error;
  }
}

export async function resetPassword(email: string) {
  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/auth?mode=resetPassword`,
      handleCodeInApp: true
    };
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    // Call your backend logout endpoint
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function createFirebaseUser(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    return { user: userCredential.user, idToken };
  } catch (error) {
    console.error('Error creating Firebase user:', error);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    return { user: userCredential.user, idToken };
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
}

export { auth }; 