# Utility Scripts

## verify-existing-users.ts

**Purpose:** Bulk verify email addresses for all existing Firebase users (pre-existing users before email verification was implemented).

### Safety Features
- ✅ Only verifies users created **before Dec 19, 2025**
- ✅ Skips already-verified users
- ✅ Detailed logging of all actions
- ✅ Error handling per user (one failure doesn't stop the whole process)
- ✅ Summary report at the end

### Usage

```bash
cd "/Users/JohnCoultas/dine-n web and MW"
npm run verify-users
```

### What It Does

1. **Fetches all users** from Firebase (paginated, handles 1000+ users)
2. **Checks verification status** - skips if already verified
3. **Checks creation date** - only verifies users created before Dec 19, 2025
4. **Updates Firebase** - sets `emailVerified: true`
5. **Logs results** - shows success/failure for each user

### Expected Output

```
🔍 Starting bulk email verification for existing users...

✓ Already verified: john@example.com
✅ VERIFIED: jane@example.com (created 2024-12-10T...)
✅ VERIFIED: test@example.com (created 2024-11-15T...)
⏭️  Skipping new user (created after cutoff): newuser@example.com

============================================================
📊 VERIFICATION SUMMARY
============================================================
Total users processed: 25
Already verified: 10
Newly verified: 12
Errors: 0
============================================================

📋 DETAILED RESULTS:

1. ✅ jane@example.com
2. ✅ test@example.com
3. ❌ error@example.com (User not found)
...

✨ Script completed successfully!
```

### When to Use

**Run this script when:**
- Pre-existing users are stuck on email verification screen
- You've just implemented email verification and need to grandfather in existing users
- Testing the verification flow with real accounts

**Don't run this script:**
- In production repeatedly (one-time use only)
- If you want new signups to go through normal verification flow

### Modifying the Cutoff Date

If you need to change which users get verified, edit the `CUTOFF_DATE` in the script:

```typescript
// Only verify users created before this date
const CUTOFF_DATE = new Date('2025-12-19T00:00:00Z');
```

### Troubleshooting

**Error: "Firebase Admin SDK not initialized"**
- Make sure `FIREBASE_SERVICE_ACCOUNT` env variable is set
- Check your `.env` file has the correct service account JSON

**Error: "Permission denied"**
- Your Firebase service account needs `User Management Admin` role
- Check Firebase Console → Project Settings → Service Accounts

**No users found:**
- Verify you're connected to the correct Firebase project
- Check that `FIREBASE_SERVICE_ACCOUNT` points to the right project

### Safety Notes

⚠️ **This script modifies user data in Firebase**
- Test on a staging environment first if possible
- The cutoff date prevents accidentally verifying brand new users
- Run during low-traffic hours to avoid conflicts
- Results are logged so you can track what was changed

### After Running

Once complete:
1. ✅ All pre-existing users can now access the app
2. ✅ New signups still require email verification
3. ✅ You can delete this script (or keep for future use)

### Rollback

If you need to un-verify users (unlikely), you'd run a similar script with:
```typescript
await auth.updateUser(userRecord.uid, {
  emailVerified: false
});
```

But this is generally not recommended.
