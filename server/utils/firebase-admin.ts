import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

console.log('Environment check:', {
  hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
  nodeEnv: process.env.NODE_ENV,
});

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
}

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  
  // Verify service account configuration
  console.log('Firebase Admin SDK Config Check:', {
    hasType: !!serviceAccount.type,
    hasProjectId: !!serviceAccount.project_id,
    hasPrivateKeyId: !!serviceAccount.private_key_id,
    hasPrivateKey: !!serviceAccount.private_key,
    hasClientEmail: !!serviceAccount.client_email,
    hasClientId: !!serviceAccount.client_id
  });

  initializeApp({
    credential: cert(serviceAccount)
  });

  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  if (error instanceof SyntaxError) {
    console.error('Invalid JSON format in FIREBASE_SERVICE_ACCOUNT');
    console.error('First 100 characters of FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT?.substring(0, 100));
  }
  throw error;
}

export const auth = getAuth(); 