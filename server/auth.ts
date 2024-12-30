import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, type Response, type NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser } from "@db/schema";
import { z } from "zod";
import { db } from "../db";
import { eq } from "drizzle-orm";

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

// extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export const isAdmin = (req: Express.Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized", message: "You must be logged in" });
  }

  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: "Forbidden", message: "Admin access required" });
  }

  next();
};

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
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
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              password_hash: users.password_hash,
              preferences: users.preferences,
              createdAt: users.createdAt,
              isAdmin: users.isAdmin,
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
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
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

      // Basic input validation
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

      // Password validation
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

      // Check if email is already taken
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

      // Create new user with hashed password
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          password_hash: hashedPassword,
          name: name?.trim() || normalizedEmail.split('@')[0],
          isAdmin: false, // Default to non-admin
        })
        .returning();

      // Log the user in after successful registration
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name
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
          user: { id: user.id, email: user.email, isAdmin: user.isAdmin },
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
      const { password_hash, ...userWithoutPassword } = req.user;
      return res.json(userWithoutPassword);
    }

    res.status(401).send("Not logged in");
  });
}