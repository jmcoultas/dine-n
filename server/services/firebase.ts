import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { config } from '../config/environment';

// Initialize Firebase Admin
// Handle escaped newlines from .env files
// In .env files, \\n gets interpreted as literal \n string by dotenv
let privateKey = config.firebasePrivateKey;

// Handle different newline encodings
if (privateKey) {
  // First try replacing \\n (double backslash)
  privateKey = privateKey.split('\\\\n').join('\n');
  // Then try replacing \n (single backslash from env)
  privateKey = privateKey.split('\\n').join('\n');

  console.log('🔑 Firebase private key processed:', {
    hasKey: !!privateKey,
    startsWithBegin: privateKey.startsWith('-----BEGIN'),
    length: privateKey.length
  });
}

let app: App | undefined;
let auth: Auth | null = null;

try {
  console.log('🚀 Initializing Firebase Admin...', {
    hasProjectId: !!config.firebaseProjectId,
    hasClientEmail: !!config.firebaseClientEmail,
    hasPrivateKey: !!privateKey,
    projectId: config.firebaseProjectId
  });

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
  console.error('❌ Firebase Admin initialization failed - authentication features will not work');
  console.error('Error:', error instanceof Error ? error.message : error);
  console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
  console.warn('Server will start anyway for testing other endpoints');
}

export async function createFirebaseToken(userId: string) {
  return auth.createCustomToken(userId);
}

export async function verifyFirebaseToken(token: string) {
  return auth.verifyIdToken(token);
}

export default auth; 