import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { z } from "zod";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { type User, type PublicUser } from "./types";
import { createFirebaseToken } from "./services/firebase";
import auth from "./services/firebase";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string): Promise<string> => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string): Promise<boolean> => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }
};

// Extend Express.User interface to match our PublicUser type
declare global {
  namespace Express {
    interface User extends PublicUser {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const [foundUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!foundUser) {
          return done(null, false, { message: "🕵️ That email address is playing hide and seek with our database. Are you sure it's registered?" });
        }

        const isMatch = await crypto.compare(password, foundUser.password_hash);
        if (!isMatch) {
          // Check if this user might have a temporary password (incomplete registration)
          try {
            const hasTempPassword = await crypto.compare("TEMPORARY_PASSWORD", foundUser.password_hash);
            if (hasTempPassword || foundUser.is_partial_registration === true) {
              return done(null, false, { 
                message: "🚧 It looks like your registration isn't complete yet. Please check your email for a verification link or restart the registration process to set your password." 
              });
            }
          } catch (tempCheckError) {
            // If temp password check fails, continue with normal error
            console.log(`Could not verify temporary password during login for user ${foundUser.id}:`, tempCheckError);
          }
          
          return done(null, false, { message: "🔐 Close, but no cigar! Your password is doing the cha-cha when it should be doing the tango." });
        }

        const user: PublicUser = {
          ...foundUser,
          subscription_status: foundUser.subscription_status || 'inactive',
          subscription_tier: foundUser.subscription_tier || 'free',
          meal_plans_generated: foundUser.meal_plans_generated || 0,
          ingredient_recipes_generated: foundUser.ingredient_recipes_generated || 0,
          firebase_uid: foundUser.firebase_uid || null,
          is_admin: foundUser.is_admin || false
        };

        // Create Firebase custom token after successful authentication
        const userFirebaseToken = await createFirebaseToken(user.id.toString());
        user.firebaseToken = userFirebaseToken;

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [foundUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!foundUser) {
        return done(new Error('User not found'));
      }

      const user: PublicUser = {
        ...foundUser,
        subscription_status: foundUser.subscription_status || 'inactive',
        subscription_tier: foundUser.subscription_tier || 'free',
        meal_plans_generated: foundUser.meal_plans_generated || 0,
        ingredient_recipes_generated: foundUser.ingredient_recipes_generated || 0,
        firebase_uid: foundUser.firebase_uid || null,
        is_admin: foundUser.is_admin || false
      };

      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register/partial", async (req, res) => {
    try {
      console.log("Partial registration request received:", req.body);
      const { email, verified_by_oobcode } = req.body;
      const authToken = req.headers['firebase-token'];

      if (!email?.trim()) {
        console.error("Email is required but was not provided");
        return res.status(400).json({ 
          error: "Validation Error",
          message: "Email is required"
        });
      }

      // Check if this is a mobile verification with oobCode but no Firebase token
      const isMobileVerification = !authToken && verified_by_oobcode;
      if (isMobileVerification) {
        console.log("Mobile verification detected - skipping Firebase token verification");
      } else if (!authToken) {
        console.error("Firebase token is required but was not provided");
        return res.status(401).json({
          error: "Authentication Error",
          message: "Firebase token is required",
        });
      }

      let firebaseUid;
      if (!isMobileVerification) {
        try {
          console.log("Verifying Firebase token...");
          const decodedToken = await auth.verifyIdToken(authToken as string);
          firebaseUid = decodedToken.uid;
          console.log(`Firebase token verified for UID: ${firebaseUid}`);
        } catch (error) {
          console.error('Error verifying Firebase token:', error);
          return res.status(401).json({
            error: "Authentication Error",
            message: "Invalid Firebase token",
            details: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        console.log("Skipping Firebase token verification for mobile flow");
        // Instead of generating a placeholder UID, try to find existing Firebase user
        try {
          console.log(`Checking if Firebase user exists for ${email.toLowerCase().trim()}`);
          const firebaseUser = await auth.getUserByEmail(email.toLowerCase().trim());
          if (firebaseUser) {
            firebaseUid = firebaseUser.uid;
            console.log(`Found existing Firebase user with UID: ${firebaseUid} for mobile flow`);
          } else {
            console.log("No existing Firebase user found for mobile flow");
            firebaseUid = null; // No Firebase user exists
          }
        } catch (firebaseError: any) {
          console.log(`No existing Firebase user found for mobile flow:`, firebaseError.message);
          firebaseUid = null; // No Firebase user exists
        }
      }

      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Checking if user exists for email: ${normalizedEmail}`);

      try {
        // Check if the user already exists in the database
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (existingUser) {
          console.log(`User already exists with ID ${existingUser.id} for email ${normalizedEmail}`);
          
          // Just return success - user already exists
          return res.json({
            message: "User already exists",
            partial: true,
            user_id: existingUser.id
          });
        }

        // User doesn't exist - create a new record
        console.log(`Creating new user record for ${normalizedEmail}`);
        
        // Create a simple temporary password
        const tempPasswordHash = await crypto.hash("TEMPORARY_PASSWORD");
        
        // Create the base user data - minimal required fields to avoid schema issues
        const userData = {
          email: normalizedEmail,
          password_hash: tempPasswordHash,
          name: normalizedEmail.split('@')[0],
          firebase_uid: firebaseUid,
          subscription_status: 'inactive' as const,
          subscription_tier: 'free' as const,
          created_at: new Date()
        };
        
        // Try to insert the user with is_partial_registration, but handle errors gracefully
        let newUser;
        try {
          // First try with is_partial_registration (may fail if column doesn't exist)
          [newUser] = await db
            .insert(users)
            .values({
              ...userData,
              is_partial_registration: true
            })
            .returning();
            
          console.log(`Created user with ID ${newUser.id} including is_partial_registration flag`);
        } catch (insertError) {
          console.warn("Insert with is_partial_registration failed, trying without:", insertError);
          
          // If that fails, try without the is_partial_registration field
          [newUser] = await db
            .insert(users)
            .values(userData)
            .returning();
            
          console.log(`Created user with ID ${newUser.id} without is_partial_registration flag`);
        }

        return res.json({
          message: "User created successfully",
          partial: true,
          user_id: newUser.id,
          mobile_flow: isMobileVerification
        });
      } catch (dbError) {
        console.error("Database error during partial registration:", dbError);
        
        // Check if it's a duplicate key error (user was created simultaneously)
        if ((dbError as any)?.code === '23505') {
          const [dupUser] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);
            
          if (dupUser) {
            return res.json({
              message: "User already exists (created simultaneously)",
              partial: true,
              user_id: dupUser.id
            });
          }
        }
        
        throw dbError; // Re-throw for the outer catch
      }
    } catch (error: unknown) {
      console.error("Partial registration error:", error);
      
      // Always return 200 to allow the user to continue to password setup
      // even if we failed to create the record
      return res.status(200).json({
        message: "Continuing to password setup",
        error: error instanceof Error ? error.message : String(error),
        partial: true
      });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request received:", req.body);
      const { email, password, name } = req.body;
      const userFirebaseToken = req.headers['firebase-token'];

      if (!email?.trim() || !password?.trim()) {
        console.error("Email or password missing in registration request");
        return res.status(400).json({ 
          error: "Validation Error",
          message: "Email and password are required",
          field: !email?.trim() ? "email" : "password",
          type: "REQUIRED_FIELD"
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        console.error(`Invalid email format: ${normalizedEmail}`);
        return res.status(400).json({
          error: "Validation Error",
          message: "Please enter a valid email address",
          field: "email",
          type: "INVALID_FORMAT"
        });
      }

      if (password.length < 6) {
        console.error("Password too short");
        return res.status(400).json({
          error: "Validation Error",
          message: "Password must be at least 6 characters long",
          field: "password",
          type: "INVALID_LENGTH"
        });
      }

      let firebaseUid;
      let isCrossBrowserCompletion = false;
      
      if (userFirebaseToken) {
        try {
          // Check if this is a cross-browser completion token
          if (typeof userFirebaseToken === 'string' && userFirebaseToken.startsWith('eyJ')) {
            // This looks like a base64 encoded JSON token (our cross-browser token)
            try {
              const decodedCrossBrowser = JSON.parse(atob(userFirebaseToken));
              if (decodedCrossBrowser.cross_browser === true && decodedCrossBrowser.email === normalizedEmail) {
                console.log("Cross-browser registration completion detected");
                isCrossBrowserCompletion = true;
                firebaseUid = null; // We don't have a real Firebase UID in this case
              }
            } catch (crossBrowserError) {
              console.log("Not a cross-browser token, trying Firebase verification");
            }
          }
          
          // If not cross-browser, try normal Firebase token verification
          if (!isCrossBrowserCompletion) {
            console.log("Verifying Firebase token for registration");
            const decodedToken = await auth.verifyIdToken(userFirebaseToken as string);
            firebaseUid = decodedToken.uid;
            console.log(`Firebase token verified for UID: ${firebaseUid}`);
          }
        } catch (error) {
          console.error('Error verifying Firebase token:', error);
          // Don't return an error, just log it - we'll try to continue without it
        }
      } else {
        console.log("No Firebase token provided with registration");
      }

      console.log(`Checking if user exists for email: ${normalizedEmail}`);
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      // Check if this is an existing user
      if (existingUser) {
        console.log(`User exists with ID ${existingUser.id} for email ${normalizedEmail}`);
        
        // Check if this is a partial registration that needs completion
        // First check the explicit flag, then check if we can verify the temporary password
        let isPartial = existingUser.is_partial_registration === true;
        
        // If the flag isn't set, try to verify if this user has the temporary password
        if (!isPartial && existingUser.password_hash) {
          try {
            const isTempPassword = await crypto.compare("TEMPORARY_PASSWORD", existingUser.password_hash);
            if (isTempPassword) {
              isPartial = true;
              console.log(`User ${existingUser.id} has temporary password - treating as partial registration`);
            }
          } catch (tempCheckError) {
            console.log(`Could not verify temporary password for user ${existingUser.id}:`, tempCheckError);
          }
        }
        
        console.log(`User state: is_partial=${isPartial}, has_password_hash=${!!existingUser.password_hash}`);
        
        if (isPartial) {
          console.log(`Completing partial registration for user ID ${existingUser.id}`);
          
          try {
            const hashedPassword = await crypto.hash(password);
            
            // Update the existing user record with the real password and name
            await db
              .update(users)
              .set({ 
                password_hash: hashedPassword,
                name: name?.trim() || existingUser.name || normalizedEmail.split('@')[0],
                firebase_uid: firebaseUid || existingUser.firebase_uid,
                is_partial_registration: false // Clear the partial registration flag
              })
              .where(eq(users.id, existingUser.id));
            
            console.log(`Updated user ${existingUser.id} - completed partial registration`);
            
            // Get the updated user
            const [updatedUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, existingUser.id))
              .limit(1);
            
            const publicUser: PublicUser = {
              ...updatedUser,
              subscription_status: updatedUser.subscription_status || 'inactive',
              subscription_tier: updatedUser.subscription_tier || 'free',
              meal_plans_generated: updatedUser.meal_plans_generated || 0,
              ingredient_recipes_generated: updatedUser.ingredient_recipes_generated || 0,
              firebase_uid: updatedUser.firebase_uid || null,
              is_admin: updatedUser.is_admin || false
            };
            
            const customToken = await createFirebaseToken(publicUser.id.toString());
            publicUser.firebaseToken = customToken;
            
            req.login(publicUser, (err) => {
              if (err) {
                console.error("Error logging in user after completing registration:", err);
                return next(err);
              }
              console.log(`User ${publicUser.id} successfully logged in after completing registration`);
              return res.json({
                message: "Registration completed successfully",
                user: publicUser
              });
            });
            
            return;
          } catch (updateError) {
            console.error("Error updating user:", updateError);
            return res.status(500).json({
              error: "Server Error",
              message: "Failed to complete registration. Please try again."
            });
          }
        }
        
        // If the user exists and is not a partial registration, check if they might be in limbo
        console.log(`User ${existingUser.id} already exists and is not in partial state`);
        
        // Check if this might be a Firebase-only user trying to complete registration
        if (!existingUser.firebase_uid && userFirebaseToken && !isCrossBrowserCompletion) {
          try {
            const decodedToken = await auth.verifyIdToken(userFirebaseToken as string);
            if (decodedToken.email?.toLowerCase() === normalizedEmail) {
              console.log(`Firebase user trying to complete registration for existing native user ${existingUser.id}`);
              
              // Update the existing user with Firebase UID and complete registration
              const hashedPassword = await crypto.hash(password);
              
              await db
                .update(users)
                .set({ 
                  password_hash: hashedPassword,
                  name: name?.trim() || existingUser.name || normalizedEmail.split('@')[0],
                  firebase_uid: decodedToken.uid,
                  is_partial_registration: false
                })
                .where(eq(users.id, existingUser.id));
              
              console.log(`Updated existing user ${existingUser.id} with Firebase UID and new password`);
              
              // Get the updated user and log them in
              const [updatedUser] = await db
                .select()
                .from(users)
                .where(eq(users.id, existingUser.id))
                .limit(1);
              
              const publicUser: PublicUser = {
                ...updatedUser,
                subscription_status: updatedUser.subscription_status || 'inactive',
                subscription_tier: updatedUser.subscription_tier || 'free',
                meal_plans_generated: updatedUser.meal_plans_generated || 0,
                ingredient_recipes_generated: updatedUser.ingredient_recipes_generated || 0,
                firebase_uid: updatedUser.firebase_uid || null
              };
              
              const customToken = await createFirebaseToken(publicUser.id.toString());
              publicUser.firebaseToken = customToken;
              
              req.login(publicUser, (err) => {
                if (err) {
                  console.error("Error logging in user after Firebase sync:", err);
                  return next(err);
                }
                console.log(`User ${publicUser.id} successfully logged in after Firebase sync`);
                return res.json({
                  message: "Registration completed successfully (synced with Firebase)",
                  user: publicUser,
                  recovered_from_limbo: true
                });
              });
              
              return;
            }
          } catch (firebaseVerificationError) {
            console.log("Firebase token verification failed during limbo recovery:", firebaseVerificationError);
          }
        }
        
        return res.status(400).json({
          error: "Account Already Exists",
          message: "An account with this email address already exists. Please use the login page to access your account, or use the 'Forgot Password' option if you need to reset your password.",
          field: "email",
          type: "DUPLICATE_EMAIL",
          suggestion: "Try logging in instead, or use the password reset option if you can't remember your password.",
          actions: {
            login: "Switch to login page",
            resetPassword: "Reset your password"
          }
        });
      }

      console.log(`Creating new user for ${normalizedEmail}`);
      const hashedPassword = await crypto.hash(password);
      
      // If we don't have a Firebase UID but the user might exist in Firebase, try to find them
      if (!firebaseUid) {
        try {
          console.log(`No Firebase UID provided, checking if Firebase user exists for ${normalizedEmail}`);
          const firebaseUser = await auth.getUserByEmail(normalizedEmail);
          if (firebaseUser) {
            firebaseUid = firebaseUser.uid;
            console.log(`Found existing Firebase user with UID: ${firebaseUid}`);
          }
        } catch (firebaseError: any) {
          console.log(`No existing Firebase user found for ${normalizedEmail}:`, firebaseError.message);
        }
      }
      
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          password_hash: hashedPassword,
          name: name?.trim() || normalizedEmail.split('@')[0],
          firebase_uid: firebaseUid || null,
          subscription_status: 'inactive' as const,
          subscription_tier: 'free' as const,
          meal_plans_generated: 0,
          ingredient_recipes_generated: 0,
          created_at: new Date(),
          is_partial_registration: false
        })
        .returning();

      console.log(`Created new user with ID ${newUser.id}`);

      const publicUser: PublicUser = {
        ...newUser,
        subscription_status: newUser.subscription_status || 'inactive',
        subscription_tier: newUser.subscription_tier || 'free',
        meal_plans_generated: newUser.meal_plans_generated || 0,
        ingredient_recipes_generated: newUser.ingredient_recipes_generated || 0,
        firebase_uid: newUser.firebase_uid || null,
        is_admin: newUser.is_admin || false
      };

      const customToken = await createFirebaseToken(publicUser.id.toString());
      publicUser.firebaseToken = customToken;

      req.login(publicUser, (err) => {
        if (err) {
          console.error("Error logging in new user:", err);
          return next(err);
        }
        console.log(`New user ${publicUser.id} successfully logged in`);
        return res.json({
          message: "Registration successful",
          user: publicUser
        });
      });
    } catch (error) {
      console.error("Registration error:", error);

      if ((error as any)?.code === '23505') {
        return res.status(400).json({
          error: "Account Already Exists",
          message: "An account with this email address already exists. Please use the login page to access your account, or use the 'Forgot Password' option if you need to reset your password.",
          field: "email",
          type: "DUPLICATE_EMAIL",
          suggestion: "Try logging in instead, or use the password reset option if you can't remember your password.",
          actions: {
            login: "Switch to login page",
            resetPassword: "Reset your password"
          }
        });
      }

      res.status(500).json({
        error: "Server Error",
        message: "An error occurred during registration. Please try again.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/login", async (req, res, next) => {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    });

    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .send("Invalid input: " + result.error.issues.map(i => i.message).join(", "));
    }

    // Check for Firebase token in case user was authenticated via Firebase
    const firebaseToken = req.headers['firebase-token'] as string | undefined;
    if (firebaseToken) {
      try {
        // Verify the Firebase token
        const decodedToken = await auth.verifyIdToken(firebaseToken);
        const email = decodedToken.email;
        const uid = decodedToken.uid;
        
        if (!email) {
          return res.status(400).json({ 
            error: "Authentication Error",
            message: "No email found in Firebase token"
          });
        }
        
        // Check if user exists in our database
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);
        
        // If user doesn't exist in our database but exists in Firebase,
        // create them in our database to prevent limbo state
        if (!existingUser) {
          console.log(`User ${email} exists in Firebase but not in our database. Creating record.`);
          
          // Generate a random password hash since we don't know their password
          // They will need to use password reset if they want to login with password later
          const tempPasswordHash = await crypto.hash("FIREBASE_USER_" + Math.random().toString(36).substring(2));
          
          try {
            // Create user in our database
            const [newUser] = await db
              .insert(users)
              .values({
                email: email.toLowerCase(),
                password_hash: tempPasswordHash,
                name: email.toLowerCase().split('@')[0], // Default name from email
                firebase_uid: uid,
                subscription_status: 'inactive' as const,
                subscription_tier: 'free' as const,
                meal_plans_generated: 0,
                created_at: new Date()
              })
              .returning();
              
            const publicUser: PublicUser = {
              ...newUser,
              subscription_status: newUser.subscription_status || 'inactive',
              subscription_tier: newUser.subscription_tier || 'free',
              meal_plans_generated: newUser.meal_plans_generated || 0,
              ingredient_recipes_generated: newUser.ingredient_recipes_generated || 0,
              firebase_uid: newUser.firebase_uid || null,
              is_admin: newUser.is_admin || false
            };
            
            // Create a custom token for Firebase authentication
            const customToken = await createFirebaseToken(publicUser.id.toString());
            publicUser.firebaseToken = customToken;
            
            req.login(publicUser, (err) => {
              if (err) {
                return next(err);
              }
              return res.json({
                message: "Login successful",
                user: publicUser
              });
            });
            
            return;
          } catch (dbError) {
            console.error('Error creating user in database during login:', dbError);
            return res.status(500).json({
              error: "Server Error",
              message: "Failed to create user account. Please try again."
            });
          }
        }
        
        // If user exists in our database, update their Firebase UID if needed
        if (!existingUser.firebase_uid || existingUser.firebase_uid !== uid) {
          await db
            .update(users)
            .set({ firebase_uid: uid })
            .where(eq(users.id, existingUser.id));
        }
        
        // Log the user in
        const publicUser: PublicUser = {
          ...existingUser,
          subscription_status: existingUser.subscription_status || 'inactive',
          subscription_tier: existingUser.subscription_tier || 'free',
          meal_plans_generated: existingUser.meal_plans_generated || 0,
          ingredient_recipes_generated: existingUser.ingredient_recipes_generated || 0,
          firebase_uid: uid
        };
        
        // Create a custom token for Firebase authentication
        const customToken = await createFirebaseToken(publicUser.id.toString());
        publicUser.firebaseToken = customToken;
        
        req.login(publicUser, (err) => {
          if (err) {
            return next(err);
          }
          return res.json({
            message: "Login successful",
            user: publicUser
          });
        });
        
        return;
      } catch (error) {
        console.error('Error verifying Firebase token during login:', error);
        // Fall back to normal authentication
      }
    }

    // Normal authentication via passport
    const cb = (err: any, user: Express.User | false | null | undefined, info: IVerifyOptions) => {
      if (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({
          error: "Server Error",
          message: "🤖 Our servers are having a moment. Please give them a coffee break and try again!",
          type: "SERVER_ERROR"
        });
      }

      if (!user) {
        // Extract the specific error message from passport
        const errorMessage = info?.message || "🎭 Something went wrong in the authentication theater. Please try your performance again!";
        
        // Determine error type based on the message content
        let errorType = "AUTHENTICATION_FAILED";
        if (errorMessage.includes("hide and seek") || errorMessage.includes("registered")) {
          errorType = "EMAIL_NOT_FOUND";
        } else if (errorMessage.includes("password") || errorMessage.includes("cha-cha") || errorMessage.includes("tango")) {
          errorType = "INCORRECT_PASSWORD";
        }

        return res.status(401).json({
          error: "Authentication Failed",
          message: errorMessage,
          type: errorType
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('Login session error:', err);
          return res.status(500).json({
            error: "Server Error",
            message: "🎪 We successfully verified you, but our session juggler dropped the ball. Please try again!",
            type: "SESSION_ERROR"
          });
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            subscription_tier: user.subscription_tier,
            subscription_status: user.subscription_status,
          },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Logout failed");
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Endpoint to help users stuck with incomplete registrations
  app.post("/api/auth/reset-registration", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email?.trim()) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Email is required"
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Reset registration request for email: ${normalizedEmail}`);
      
      // Find the user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      
      if (!existingUser) {
        return res.status(404).json({
          error: "User Not Found",
          message: "No account found with this email address"
        });
      }
      
      // Check if this user has a temporary password or is marked as partial
      let canReset = existingUser.is_partial_registration === true;
      
      if (!canReset) {
        try {
          const hasTempPassword = await crypto.compare("TEMPORARY_PASSWORD", existingUser.password_hash);
          canReset = hasTempPassword;
        } catch (tempCheckError) {
          console.log(`Could not verify temporary password for reset request:`, tempCheckError);
        }
      }
      
      if (!canReset) {
        return res.status(400).json({
          error: "Reset Not Allowed",
          message: "This account appears to be fully registered. Please use password reset instead."
        });
      }
      
      // Reset the user to partial registration state
      const tempPasswordHash = await crypto.hash("TEMPORARY_PASSWORD");
      
      await db
        .update(users)
        .set({
          password_hash: tempPasswordHash,
          is_partial_registration: true
        })
        .where(eq(users.id, existingUser.id));
      
      console.log(`Reset registration state for user ${existingUser.id}`);
      
      res.json({
        message: "Registration state reset successfully. You can now restart the registration process.",
        canRetry: true
      });
      
    } catch (error) {
      console.error("Error resetting registration:", error);
      res.status(500).json({
        error: "Server Error",
        message: "Failed to reset registration state. Please try again."
      });
    }
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user;
      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        preferences: user.preferences,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
      });
    }
    res.status(401).send("Not logged in");
  });
}