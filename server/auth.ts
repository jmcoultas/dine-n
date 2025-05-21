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
          return done(null, false, { message: "Incorrect email address." });
        }

        const isMatch = await crypto.compare(password, foundUser.password_hash);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        const user: PublicUser = {
          ...foundUser,
          subscription_status: foundUser.subscription_status || 'inactive',
          subscription_tier: foundUser.subscription_tier || 'free',
          meal_plans_generated: foundUser.meal_plans_generated || 0,
          ingredient_recipes_generated: foundUser.ingredient_recipes_generated || 0,
          firebase_uid: foundUser.firebase_uid || null
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
        firebase_uid: foundUser.firebase_uid || null
      };

      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register/partial", async (req, res) => {
    try {
      const { email } = req.body;
      const authToken = req.headers['firebase-token'];

      if (!email?.trim()) {
        return res.status(400).json({ 
          error: "Validation Error",
          message: "Email is required",
          field: "email",
          type: "REQUIRED_FIELD"
        });
      }

      if (!authToken) {
        return res.status(401).json({
          error: "Authentication Error",
          message: "Firebase token is required",
        });
      }

      let firebaseUid;
      try {
        const decodedToken = await auth.verifyIdToken(authToken as string);
        firebaseUid = decodedToken.uid;
        
        if (decodedToken.email !== email.trim().toLowerCase()) {
          return res.status(401).json({
            error: "Authentication Error",
            message: "Email mismatch between token and request",
          });
        }
      } catch (error) {
        console.error('Error verifying Firebase token:', error);
        return res.status(401).json({
          error: "Authentication Error",
          message: "Invalid Firebase token",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        return res.json({
          message: "User already exists",
          partial: true
        });
      }

      const tempPasswordHash = await crypto.hash("TEMPORARY_PASSWORD_" + Math.random().toString(36).substring(2));
      
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          password_hash: tempPasswordHash,
          name: normalizedEmail.split('@')[0],
          firebase_uid: firebaseUid,
          subscription_status: 'inactive' as const,
          subscription_tier: 'free' as const,
          meal_plans_generated: 0,
          created_at: new Date()
        })
        .returning();

      console.log(`Created partial user record for ${normalizedEmail} with ID ${newUser.id}`);

      return res.json({
        message: "Partial registration successful",
        partial: true
      });
    } catch (error) {
      console.error("Partial registration error:", error);
      res.status(500).json({
        error: "Server Error",
        message: "An error occurred during partial registration. Please try again.",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      const userFirebaseToken = req.headers['firebase-token'];

      if (!email?.trim() || !password?.trim()) {
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
        return res.status(400).json({
          error: "Validation Error",
          message: "Please enter a valid email address",
          field: "email",
          type: "INVALID_FORMAT"
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Password must be at least 6 characters long",
          field: "password",
          type: "INVALID_LENGTH"
        });
      }

      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasUpperCase || !hasNumber) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Password must contain at least one uppercase letter and one number",
          field: "password",
          type: "INVALID_COMPLEXITY"
        });
      }

      let firebaseUid;
      if (userFirebaseToken) {
        try {
          const decodedToken = await auth.verifyIdToken(userFirebaseToken as string);
          firebaseUid = decodedToken.uid;
        } catch (error) {
          console.error('Error verifying Firebase token:', error);
          return res.status(401).json({
            error: "Authentication Error",
            message: "Invalid Firebase token",
          });
        }
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        if (existingUser.password_hash.startsWith('TEMPORARY_PASSWORD_') ||
            existingUser.password_hash.includes('TEMPORARY_PASSWORD_')) {
          const hashedPassword = await crypto.hash(password);
          
          await db
            .update(users)
            .set({ 
              password_hash: hashedPassword,
              name: name?.trim() || existingUser.name || normalizedEmail.split('@')[0],
              firebase_uid: firebaseUid || existingUser.firebase_uid
            })
            .where(eq(users.id, existingUser.id));
            
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
              return next(err);
            }
            return res.json({
              message: "Registration completed successfully",
              user: publicUser
            });
          });
          
          return;
        }
        
        return res.status(400).json({
          error: "Registration Error",
          message: "This email address is already registered",
          field: "email",
          type: "DUPLICATE_EMAIL"
        });
      }

      const hashedPassword = await crypto.hash(password);
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
          created_at: new Date()
        })
        .returning();

      const publicUser: PublicUser = {
        ...newUser,
        subscription_status: newUser.subscription_status || 'inactive',
        subscription_tier: newUser.subscription_tier || 'free',
        meal_plans_generated: newUser.meal_plans_generated || 0,
        ingredient_recipes_generated: newUser.ingredient_recipes_generated || 0,
        firebase_uid: newUser.firebase_uid || null
      };

      const customToken = await createFirebaseToken(publicUser.id.toString());
      publicUser.firebaseToken = customToken;

      req.login(publicUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: publicUser
        });
      });
    } catch (error) {
      console.error("Registration error:", error);

      if ((error as any)?.code === '23505') {
        return res.status(400).json({
          error: "Registration Error",
          message: "This email address is already registered",
          field: "email",
          type: "DUPLICATE_EMAIL"
        });
      }

      res.status(500).json({
        error: "Server Error",
        message: "An error occurred during registration. Please try again.",
        details: error instanceof Error ? error.message : undefined
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
              firebase_uid: newUser.firebase_uid || null
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
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Login failed");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
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