import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config/environment';

// Initialize Firebase Admin
// Handle escaped newlines from .env files
// In .env files, \\n gets interpreted as literal \n string by dotenv
const privateKey = config.firebasePrivateKey
  ?.split('\\n').join('\n');  // Replace all \n (literal backslash-n) with actual newlines

let app;
let auth;

try {
  app = initializeApp({
    credential: cert({
      projectId: config.firebaseProjectId,
      clientEmail: config.firebaseClientEmail,
      privateKey: privateKey,
    }),
  });
  auth = getAuth(app);
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.warn('⚠️  Firebase Admin initialization failed - authentication features will not work');
  console.warn('Error:', error instanceof Error ? error.message : error);
  console.warn('Server will start anyway for testing other endpoints');
  // Create a dummy auth object for development
  auth = null as any;
}

export async function createFirebaseToken(userId: string) {
  return auth.createCustomToken(userId);
}

export async function verifyFirebaseToken(token: string) {
  return auth.verifyIdToken(token);
}

export default auth; 