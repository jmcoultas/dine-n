/**
 * This script can be run to fix users who are in "limbo" - they exist in Firebase
 * but not in our database. It will import users from Firebase and create records
 * for them in our database, marking them as partial registrations so they can 
 * complete the process.
 */

import { db } from "../../db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getRandomString } from "../utils";

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
  });
}

/**
 * Fix limbo users - those who exist in Firebase but not in our database
 */
export async function fixLimboUsers() {
  console.log("Starting process to fix users in limbo...");
  
  try {
    // List all users from Firebase
    const auth = getAuth();
    const listUsersResult = await auth.listUsers();
    
    const firebaseUsers = listUsersResult.users;
    console.log(`Found ${firebaseUsers.length} users in Firebase`);
    
    // For each Firebase user, check if they exist in our database
    let importCount = 0;
    let existingCount = 0;
    
    for (const firebaseUser of firebaseUsers) {
      if (!firebaseUser.email) {
        console.log(`Skipping user ${firebaseUser.uid} - no email address`);
        continue;
      }
      
      const email = firebaseUser.email.toLowerCase();
      
      // Check if user exists in our database
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (existingUser) {
        // User exists, update Firebase UID if needed
        existingCount++;
        
        if (!existingUser.firebase_uid || existingUser.firebase_uid !== firebaseUser.uid) {
          await db
            .update(users)
            .set({ firebase_uid: firebaseUser.uid })
            .where(eq(users.id, existingUser.id));
          
          console.log(`Updated Firebase UID for user ${email} (ID: ${existingUser.id})`);
        }
      } else {
        // User doesn't exist in our database - create them as a partial registration
        try {
          const [newUser] = await db
            .insert(users)
            .values({
              email: email,
              password_hash: `TEMPORARY_${getRandomString(12)}`,
              name: email.split('@')[0],
              firebase_uid: firebaseUser.uid,
              subscription_status: 'inactive',
              subscription_tier: 'free',
              meal_plans_generated: 0,
              ingredient_recipes_generated: 0,
              created_at: new Date(),
              is_partial_registration: true
            })
            .returning();
          
          console.log(`Created user record for ${email} (ID: ${newUser.id})`);
          importCount++;
        } catch (error) {
          console.error(`Error creating user ${email}:`, error);
        }
      }
    }
    
    console.log(`Process completed. Found ${existingCount} existing users, imported ${importCount} new users.`);
    
  } catch (error) {
    console.error("Error fixing limbo users:", error);
    throw error;
  }
}

// Run the script directly if executed from command line
if (require.main === module) {
  fixLimboUsers()
    .then(() => {
      console.log("Limbo users fix completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("Error running limbo users fix:", error);
      process.exit(1);
    });
} 