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
 * Initiates email verification signup flow by creating a temporary user and sending verification
 */
export async function sendEmailSignupLink(email: string) {
  try {
    console.log("Firebase auth instance:", auth);
    console.log("Current config:", {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 5) + "...", // Don't log full key
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      callbackUrl: `${window.location.origin}/auth/verify-email`
    });
    
    // Generate a temporary password - user will set their real password after verification
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-2) + "!1";
    
    // Create the user with temporary password
    try {
      console.log("Creating user with temporary password...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      
      // Store the temp password for later use during verification
      localStorage.setItem('tempAuthPassword', tempPassword);
      
      // Send verification email with custom action code settings
      if (userCredential.user) {
        // The verification URL must include the continueUrl parameter for Firebase to add it to the email
        // Firebase will automatically append mode=verifyEmail and oobCode parameters to this URL
        const actionCodeSettings = {
          // URL you want to redirect back to after email verification
          // Include email parameter in the URL for both mobile and desktop
          url: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(email)}`,
          handleCodeInApp: true
        };
        
        console.log("Sending verification email with settings:", actionCodeSettings);
        await sendEmailVerification(userCredential.user, actionCodeSettings);
        console.log("Verification email sent successfully");
      }
      
      // Save the email locally to remember the user
      localStorage.setItem('emailForSignup', email);
      
      // Sign out - user will sign back in after verification and password setup
      await firebaseSignOut(auth);
      
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
              throw new Error('User already exists and is verified. Please try logging in instead.');
            }
          } else {
            throw new Error('Account already exists with this email. Try resetting your password if you cannot log in.');
          }
        } catch (innerError) {
          console.error("Failed to resend verification:", innerError);
          throw new Error('Account exists with this email. Please login or use password reset if needed.');
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
 */
export async function completeEmailSignup(email: string, password: string) {
  try {
    console.log("Starting completeEmailSignup for email:", email);
    // First sign in the user with the temporary password
    const tempPassword = localStorage.getItem('tempAuthPassword');
    
    if (!tempPassword) {
      console.error("No tempAuthPassword found in localStorage");
      
      // Check if the user is already signed in - this can happen if they completed verification
      // but the localStorage was cleared
      if (auth.currentUser) {
        console.log("User is already signed in, proceeding with current user");
        const user = auth.currentUser;
        
        // If the email is verified but we have no temp password, continue with this user
        if (user.emailVerified) {
          // Update the user's password in Firebase
          try {
            const { EmailAuthProvider, updatePassword } = await import('firebase/auth');
            
            console.log("Updating user password in Firebase for already signed in user");
            await updatePassword(user, password);
            console.log("Password updated successfully in Firebase");
            
            // Get the token for backend authentication
            console.log("Getting ID token for backend authentication");
            const idToken = await user.getIdToken(true); // Force refresh to get updated token
            
            return { user, idToken };
          } catch (updateError: any) {
            console.error("Error updating password for already signed in user:", updateError);
            throw new Error('Failed to update password. Please try again or contact support.');
          }
        } else {
          throw new Error('Email not verified. Please check your email and click the verification link.');
        }
      } else {
        // If we don't have a temp password and no user is signed in,
        // try to send a password reset email instead of starting over
        console.log("No signed-in user and no temp password. Attempting to reset password flow instead.");
        
        try {
          const { sendPasswordResetEmail } = await import('firebase/auth');
          await sendPasswordResetEmail(auth, email);
          throw new Error(`We couldn't complete your registration normally. A password reset link has been sent to ${email}. Please check your email to set your password.`);
        } catch (resetError) {
          console.error("Error sending password reset:", resetError);
          throw new Error('Temporary authentication data not found. Please restart the registration process.');
        }
      }
    }
    
    try {
      // Sign in with email and temporary password
      console.log("Attempting to sign in with temp password");
      const userCredential = await signInWithEmailAndPassword(auth, email, tempPassword);
      const user = userCredential.user;
      console.log("Successfully signed in with temp password");
      
      // Verify the user's email is verified
      if (!user.emailVerified) {
        console.error("User email is not verified");
        throw new Error('Email not verified. Please check your email and click the verification link.');
      }
      
      // Update the user's password in Firebase
      try {
        const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
        
        // First re-authenticate the user to allow sensitive operations
        console.log("Re-authenticating user for password update");
        const credential = EmailAuthProvider.credential(email, tempPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Then update the password
        console.log("Updating user password in Firebase");
        await updatePassword(user, password);
        console.log("Password updated successfully in Firebase");
      } catch (updateError: any) {
        console.error("Error updating password in Firebase:", updateError);
        // If we can't update the password in Firebase, we'll let the backend handle it
        // But we'll log the error for debugging
        console.warn("Firebase password update failed, will rely on backend update", updateError.code, updateError.message);
      }
      
      // Get the token for backend authentication
      console.log("Getting ID token for backend authentication");
      const idToken = await user.getIdToken(true); // Force refresh to get updated token
      
      // Clear temporary auth data
      localStorage.removeItem('tempAuthPassword');
      
      return { user, idToken };
    } catch (error: any) {
      console.error('Error during sign-in with temporary password:', error);
      
      // If the user exists but password is wrong, they may have already completed registration
      // or the temp password is no longer valid
      if (error.code === 'auth/wrong-password') {
        // Try to send a password reset email instead
        try {
          const { sendPasswordResetEmail } = await import('firebase/auth');
          await sendPasswordResetEmail(auth, email);
          throw new Error(`The temporary password is no longer valid. A password reset link has been sent to ${email}. Please check your email to set your password.`);
        } catch (resetError) {
          console.error("Error sending password reset:", resetError);
          throw new Error('The temporary password is no longer valid. Please restart the registration process.');
        }
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('User account not found. Please restart the registration process.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many sign-in attempts. Please try again later.');
      } else if (error.code) {
        throw new Error(`Authentication error (${error.code}). Please restart the registration process.`);
      } else {
        throw new Error('Failed to authenticate. Please restart the registration process.');
      }
    }
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