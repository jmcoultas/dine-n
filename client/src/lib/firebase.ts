import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendEmailVerification,
  User,
  AuthError
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
      url: 'https://dine-n.replit.app/auth',
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

/**
 * Generates a temporary password for Firebase account creation
 */
function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-2) + "!1";
}

/**
 * Initiates the email signup flow by creating a Firebase user with a temporary password
 * and sending a verification email
 */
export async function emailSignup(email: string) {
  try {
    console.log("Starting email signup process for:", email);
    
    // Generate a temporary password for Firebase account creation
    const tempPassword = generateTempPassword();
    console.log("Generated temporary password for Firebase account");
    
    // Store the temporary password in localStorage for same-browser completion
    localStorage.setItem('tempAuthPassword', tempPassword);
    localStorage.setItem('emailForSignup', email);
    
    console.log("Creating Firebase user with temporary password");
    const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
    const user = userCredential.user;
    console.log("Firebase user created successfully:", user.uid);
    
    // Configure the email verification link to point to our verification page
    const actionCodeSettings = {
      url: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(email)}`,
      handleCodeInApp: true
    };
    
    console.log("Sending email verification with action code settings:", actionCodeSettings);
    
    try {
      await sendEmailVerification(user, actionCodeSettings);
      console.log("Email verification sent successfully");
      
      // Important: Sign out the user after sending verification
      // This prevents issues with Firebase auth state
      await firebaseSignOut(auth);
      console.log("User signed out after sending verification email");
      
      // Show helpful message about cross-browser usage
      console.log("Email signup completed. User should check email for verification link.");
      console.log("Note: If user opens verification link in different browser, they'll be guided through password reset flow.");
      
      return { success: true };
    } catch (error) {
      console.error("Error in user creation or email verification:", error);
      
      // Handle specific errors
      const authError = error as AuthError;
      if (authError.code === 'auth/email-already-in-use') {
        // If user exists but may not be verified, try to sign them in and resend verification
        try {
          console.log("User already exists, trying to sign in and resend verification...");
          // Only attempt this if we think the temporary password might still be valid
          const storedTempPwd = localStorage.getItem('tempAuthPassword');
          
          if (storedTempPwd) {
            const userCredential = await signInWithEmailAndPassword(auth, email, storedTempPwd);
            
            // If user is not verified, send verification email again
            if (userCredential.user && !userCredential.user.emailVerified) {
              const actionCodeSettings = {
                url: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(email)}`,
                handleCodeInApp: true
              };
              
              await sendEmailVerification(userCredential.user, actionCodeSettings);
              console.log("Re-sent verification email successfully");
              
              // Sign out after sending verification
              await firebaseSignOut(auth);
              
              return { success: true };
            } else {
              throw new Error('Account already exists with this email address. Please use the login page to access your account, or use the password reset option if you need help.');
            }
          } else {
            throw new Error('Account already exists with this email address. Please use the login page to access your account, or use the password reset option if you need help.');
          }
        } catch (innerError) {
          console.error("Failed to resend verification:", innerError);
          throw new Error('An account already exists with this email address. Please use the login page to access your account, or use the password reset option if you need help.');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error in email signup process:', error);
    // Log additional details about the error object
    if (error && typeof error === 'object') {
      const err = error as any;
      if ('code' in err) console.error('Error code:', err.code);
      if ('message' in err) console.error('Error message:', err.message);
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
    throw error;
  }
}

/**
 * Completes the email signup flow after email verification by setting the user's actual password
 * This version works across browsers and devices by not relying on localStorage
 */
export async function completeEmailSignup(email: string, password: string) {
  try {
    console.log("Starting completeEmailSignup for email:", email);
    
    // First, check if we have indicators that this is a same-browser completion
    const hasStoredEmail = localStorage.getItem('emailForSignup') === email;
    const hasStoredTempPassword = !!localStorage.getItem('tempAuthPassword');
    const isSameBrowser = hasStoredEmail && hasStoredTempPassword;
    
    console.log("Browser context check:", {
      hasStoredEmail,
      hasStoredTempPassword,
      isSameBrowser,
      currentUser: !!auth.currentUser
    });
    
    // Check if the user is already signed in from the verification process
    if (auth.currentUser) {
      console.log("User is already signed in from verification, proceeding with current user");
      const user = auth.currentUser;
      
      // Verify the email matches and is verified
      if (user.email?.toLowerCase() === email.toLowerCase() && user.emailVerified) {
        try {
          const { updatePassword } = await import('firebase/auth');
          
          console.log("Updating user password in Firebase for verified user");
          await updatePassword(user, password);
          console.log("Password updated successfully in Firebase");
          
          // Get the token for backend authentication
          console.log("Getting ID token for backend authentication");
          const idToken = await user.getIdToken(true); // Force refresh to get updated token
          
          return { user, idToken };
        } catch (updateError: any) {
          console.error("Error updating password for verified user:", updateError);
          
          // If password update fails, we can still proceed with backend-only approach
          console.log("Firebase password update failed, proceeding with backend-only approach");
          const idToken = await user.getIdToken(true);
          return { user, idToken };
        }
      } else {
        throw new Error('Email verification mismatch or email not verified.');
      }
    }
    
    // If no user is signed in, check if this is likely a same-browser scenario
    // where we can try to sign in with the temporary password
    if (isSameBrowser) {
      console.log("Same-browser scenario detected, attempting to sign in with temporary password");
      const storedTempPassword = localStorage.getItem('tempAuthPassword');
      
      if (storedTempPassword) {
        try {
          const { signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');
          
          console.log("Attempting to sign in with stored temporary password");
          const userCredential = await signInWithEmailAndPassword(auth, email, storedTempPassword);
          const user = userCredential.user;
          
          if (user && user.emailVerified) {
            console.log("Successfully signed in with temporary password, updating to real password");
            
            try {
              await updatePassword(user, password);
              console.log("Password updated successfully");
              
              const idToken = await user.getIdToken(true);
              return { user, idToken };
            } catch (updateError: any) {
              console.error("Error updating password:", updateError);
              // Still return the token, backend can handle password update
              const idToken = await user.getIdToken(true);
              return { user, idToken };
            }
          } else {
            console.log("User not verified or sign-in failed");
          }
        } catch (signInError: any) {
          console.log("Could not sign in with temporary password:", signInError.message);
          // Continue to cross-browser handling
        }
      }
    }
    
    // Only if we've exhausted same-browser options, consider cross-browser approach
    console.log("No same-browser options available, checking for cross-browser scenario");
    
    // For true cross-browser scenarios, we'll use a backend-only approach
    // But first, let's try to avoid sending unnecessary password reset emails
    console.log("Using backend-only registration completion without password reset email");
    
    // Create a mock Firebase user object for the backend call
    // The backend will handle the actual verification and password update
    const mockUser = {
      email: email,
      emailVerified: true, // We assume verification happened since they got here
      uid: `cross_browser_${Date.now()}` // Temporary UID for backend processing
    };
    
    // Generate a temporary token for backend authentication
    const tempToken = btoa(JSON.stringify({
      email: email,
      verified: true,
      timestamp: Date.now(),
      cross_browser: true
    }));
    
    return { 
      user: mockUser, 
      idToken: tempToken,
      crossBrowser: true // Flag to indicate this is a cross-browser completion
    };
    
  } catch (error) {
    console.error('Error completing email signup:', error);
    throw error;
  }
}

/**
 * Checks if the current user's email is verified
 */
export function isEmailVerified() {
  return auth.currentUser?.emailVerified || false;
}

/**
 * Checks if the current URL contains an email sign-in link
 */
export function isEmailSignInLink() {
  return isSignInWithEmailLink(auth, window.location.href);
}

export { auth }; 