import { FirebaseAuthDiagnostic } from "@/components/FirebaseAuthDiagnostic";
import { auth } from "@/lib/firebase";

export default function FirebaseDiagnosticPage() {
  // Check which Firebase methods are enabled
  const isEmailVerificationEnabled = import.meta.env.VITE_FIREBASE_EMAIL_VERIFICATION === 'true';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Firebase Diagnostic Tool</h1>
          <p className="text-gray-500 mt-2">
            Test and diagnose Firebase authentication issues
          </p>
        </div>

        <div className="grid gap-6">
          <div className="p-4 border rounded-lg bg-gray-50">
            <h2 className="text-lg font-medium mb-2">Firebase Configuration</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-semibold">API Key:</div>
              <div>{import.meta.env.VITE_FIREBASE_API_KEY ? "Configured ✓" : "Not configured ✗"}</div>
              
              <div className="font-semibold">Auth Domain:</div>
              <div>{import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "Not configured ✗"}</div>
              
              <div className="font-semibold">Project ID:</div>
              <div>{import.meta.env.VITE_FIREBASE_PROJECT_ID || "Not configured ✗"}</div>
              
              <div className="font-semibold">Auth Instance:</div>
              <div>{auth ? "Initialized ✓" : "Not initialized ✗"}</div>
              
              <div className="font-semibold">Current User:</div>
              <div>{auth.currentUser ? `Signed in as ${auth.currentUser.email}` : "Not signed in"}</div>
            </div>
          </div>

          <FirebaseAuthDiagnostic />
          
          <div className="p-4 border rounded-lg bg-gray-50">
            <h2 className="text-lg font-medium mb-2">Email Verification vs Email Link Authentication</h2>
            <div className="space-y-4 text-sm">
              <p><strong>Email Verification Flow:</strong> Creates a user with email/password, then sends a verification email to confirm the user's email address.</p>
              <p><strong>Email Link Authentication:</strong> A passwordless sign-in method where users can sign in by clicking a link in their email without setting a password.</p>
              <p>Our application uses <strong>Email Verification</strong> to validate users' email addresses before allowing them to set a password and access the application.</p>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-gray-50">
            <h2 className="text-lg font-medium mb-2">Common Solutions</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Verify that <strong>Email/Password authentication</strong> is enabled in Firebase console</li>
              <li>Verify that <strong>Email verification</strong> is allowed in your Firebase project settings</li>
              <li>Make sure your domain is added to <strong>authorized domains</strong> in Firebase Authentication settings</li>
              <li>Check that your Firebase API key is not restricted in Google Cloud Console</li>
              <li>Ensure your Firebase project is properly configured with a valid billing account</li>
              <li>Check if your testing environment (e.g., .replit.dev domain) is properly authorized</li>
              <li>Check Firebase console logs for any quota or service limitations</li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg bg-gray-50">
            <h2 className="text-lg font-medium mb-2">Troubleshooting Steps</h2>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong>Enable Email/Password Authentication:</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>Go to Firebase Console → Authentication → Sign-in methods</li>
                  <li>Enable "Email/Password" provider</li>
                </ul>
              </li>
              <li>
                <strong>Authorize Your Domain:</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>Go to Firebase Console → Authentication → Settings → Authorized domains</li>
                  <li>Add your domain (e.g., your-app.replit.dev)</li>
                </ul>
              </li>
              <li>
                <strong>Test Basic Authentication:</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>Use the diagnostic tool above to test basic Email/Password authentication</li>
                  <li>If this works but Email Verification doesn't, it suggests a configuration issue with verification</li>
                </ul>
              </li>
              <li>
                <strong>Check API Key Restrictions:</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>Go to Google Cloud Console → APIs & Services → Credentials</li>
                  <li>Check if your API key has any website restrictions that might affect authentication</li>
                </ul>
              </li>
              <li>
                <strong>Review Security Rules:</strong>
                <ul className="list-disc pl-5 mt-1">
                  <li>If you're using Firestore or Realtime Database, ensure your security rules allow the necessary operations</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 