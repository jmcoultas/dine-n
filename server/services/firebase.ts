import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config } from '../config/environment';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: config.firebaseProjectId,
    clientEmail: config.firebaseClientEmail,
    privateKey: config.firebasePrivateKey?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth(app);

export async function createFirebaseToken(userId: string) {
  return auth.createCustomToken(userId);
}

export async function verifyFirebaseToken(token: string) {
  return auth.verifyIdToken(token);
}

export default auth; 