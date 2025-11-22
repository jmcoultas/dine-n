import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { config } from '../config/environment';

let app: App | undefined;
let auth: Auth | null = null;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountJson) {
    console.log('🚀 Initializing Firebase Admin with service account JSON...');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    
    console.log('✅ Firebase Admin initialized successfully from service account', {
      projectId: serviceAccount.project_id
    });
  } else {
    console.log('🚀 Initializing Firebase Admin with individual credentials...');
    
    let privateKey = config.firebasePrivateKey;
    
    if (privateKey) {
      privateKey = privateKey.split('\\\\n').join('\n');
      privateKey = privateKey.split('\\n').join('\n');
      
      console.log('🔑 Firebase private key processed:', {
        hasKey: !!privateKey,
        startsWithBegin: privateKey.startsWith('-----BEGIN'),
        length: privateKey.length
      });
    }
    
    console.log('Firebase config check:', {
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
    
    console.log('✅ Firebase Admin initialized successfully from individual credentials');
  }
  
  auth = getAuth(app);
} catch (error) {
  console.error('❌ Firebase Admin initialization failed - authentication features will not work');
  console.error('Error:', error instanceof Error ? error.message : error);
  console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
  console.warn('Server will start anyway for testing other endpoints');
}

// Helper to get auth instance with null check
export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase Admin is not initialized');
  }
  return auth as Auth; // Type assertion: we've verified it's not null
}

export async function createFirebaseToken(userId: string) {
  return getAuthInstance().createCustomToken(userId);
}

export async function verifyFirebaseToken(token: string) {
  return getAuthInstance().verifyIdToken(token);
}

// Export both auth (for backwards compatibility) and getAuthInstance
export default auth;
export { auth }; 