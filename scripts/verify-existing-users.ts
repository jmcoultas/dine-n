/**
 * One-time script to verify all existing user emails in Firebase
 *
 * This script:
 * 1. Fetches all users from Firebase
 * 2. Filters for unverified emails
 * 3. Sets emailVerified = true for each user
 * 4. Logs results
 *
 * Usage:
 *   npm run verify-users
 *
 * Safety: Only verifies users created before Dec 19, 2024 (pre-existing users)
 */

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();

// Safety cutoff: Only verify users created before this date (existing users)
const CUTOFF_DATE = new Date('2025-12-19T00:00:00Z');

interface VerificationResult {
  email: string;
  uid: string;
  success: boolean;
  reason?: string;
}

async function verifyExistingUsers() {
  console.log('🔍 Starting bulk email verification for existing users...\n');

  const results: VerificationResult[] = [];
  let totalUsers = 0;
  let alreadyVerified = 0;
  let newlyVerified = 0;
  let errors = 0;

  try {
    // List all users (paginated)
    let nextPageToken: string | undefined;

    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);

      for (const userRecord of listUsersResult.users) {
        totalUsers++;

        // Skip if already verified
        if (userRecord.emailVerified) {
          alreadyVerified++;
          console.log(`✓ Already verified: ${userRecord.email}`);
          continue;
        }

        // Safety check: Only verify users created before cutoff date
        const createdAt = new Date(userRecord.metadata.creationTime);
        if (createdAt > CUTOFF_DATE) {
          console.log(`⏭️  Skipping new user (created after cutoff): ${userRecord.email}`);
          results.push({
            email: userRecord.email || 'no-email',
            uid: userRecord.uid,
            success: false,
            reason: 'Created after cutoff date - skip for now'
          });
          continue;
        }

        // Verify the email
        try {
          await auth.updateUser(userRecord.uid, {
            emailVerified: true
          });

          newlyVerified++;
          console.log(`✅ VERIFIED: ${userRecord.email} (created ${createdAt.toISOString()})`);

          results.push({
            email: userRecord.email || 'no-email',
            uid: userRecord.uid,
            success: true
          });
        } catch (error: any) {
          errors++;
          console.error(`❌ ERROR verifying ${userRecord.email}:`, error.message);

          results.push({
            email: userRecord.email || 'no-email',
            uid: userRecord.uid,
            success: false,
            reason: error.message
          });
        }
      }

      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${totalUsers}`);
    console.log(`Already verified: ${alreadyVerified}`);
    console.log(`Newly verified: ${newlyVerified}`);
    console.log(`Errors: ${errors}`);
    console.log('='.repeat(60) + '\n');

    // Print detailed results
    if (results.length > 0) {
      console.log('📋 DETAILED RESULTS:\n');
      results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        const reason = result.reason ? ` (${result.reason})` : '';
        console.log(`${index + 1}. ${status} ${result.email}${reason}`);
      });
    }

    console.log('\n✨ Script completed successfully!\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
verifyExistingUsers();
