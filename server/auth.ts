import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, password_reset_tokens, type User } from "@db/schema";
import { z } from "zod";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { emailService } from "./services/email";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User extends Pick<User, keyof User> { }
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
        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            password_hash: users.password_hash,
            preferences: users.preferences,
            stripe_customer_id: users.stripe_customer_id,
            stripe_subscription_id: users.stripe_subscription_id,
            subscription_status: users.subscription_status,
            subscription_tier: users.subscription_tier,
            subscription_end_date: users.subscription_end_date,
            created_at: users.created_at,
          })
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect email address." });
        }
        const isMatch = await crypto.compare(password, user.password_hash);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
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
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          password_hash: users.password_hash,
          preferences: users.preferences,
          stripe_customer_id: users.stripe_customer_id,
          stripe_subscription_id: users.stripe_subscription_id,
          subscription_status: users.subscription_status,
          subscription_tier: users.subscription_tier,
          subscription_end_date: users.subscription_end_date,
          created_at: users.created_at,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, name } = req.body;

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

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
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
          subscription_status: 'inactive',
          subscription_tier: 'free',
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            subscription_tier: newUser.subscription_tier,
            subscription_status: newUser.subscription_status,
          }
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

  app.post("/api/login", (req, res, next) => {
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

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
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

  // Add new password reset endpoints
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email?.trim()) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Email is required",
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!user) {
        // Return success even if user not found to prevent email enumeration
        return res.json({ message: "If an account exists with that email, you will receive a password reset link shortly." });
      }

      // Generate reset token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Save reset token
      await db
        .insert(password_reset_tokens)
        .values({
          user_id: user.id,
          token,
          expires_at: expiresAt,
        });

      // Send reset email
      await emailService.sendPasswordResetEmail(user.email, token, user.id);

      res.json({ message: "If an account exists with that email, you will receive a password reset link shortly." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ 
        error: "Server Error",
        message: "Failed to process password reset request"
      });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, userId, newPassword } = req.body;

      if (!token || !userId || !newPassword) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Missing required fields"
        });
      }

      // Validate password requirements
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Password must be at least 6 characters long"
        });
      }

      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      if (!hasUpperCase || !hasNumber) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Password must contain at least one uppercase letter and one number"
        });
      }

      // Find valid reset token
      const [resetToken] = await db
        .select()
        .from(password_reset_tokens)
        .where(eq(password_reset_tokens.token, token))
        .limit(1);

      if (!resetToken || resetToken.user_id !== userId || resetToken.expires_at < new Date()) {
        return res.status(400).json({
          error: "Invalid Token",
          message: "Invalid or expired reset token"
        });
      }

      // Update password
      const hashedPassword = await crypto.hash(newPassword);
      await db
        .update(users)
        .set({ password_hash: hashedPassword })
        .where(eq(users.id, userId));

      // Delete used token
      await db
        .delete(password_reset_tokens)
        .where(eq(password_reset_tokens.token, token));

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ 
        error: "Server Error",
        message: "Failed to reset password"
      });
    }
  });

  return app;
}