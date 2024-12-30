import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { sql } from "drizzle-orm";
import { db } from "../db";

const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT) || 5000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Development CORS settings
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Test database connection first
db.execute(sql`SELECT 1`)
  .then(() => {
    console.log("[express] Database connection successful");

    // Setup authentication
    setupAuth(app);

    // Register routes
    registerRoutes(app);

    // Setup Vite in development mode
    if (process.env.NODE_ENV !== 'production') {
      setupVite(app, server).catch(err => {
        console.error("[express] Vite setup error:", err);
      });
    } else {
      serveStatic(app);
    }

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[express] Server error:', err);
      res.status(500).json({ error: "Server Error", message: err.message });
    });

    // Start server
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[express] Server running on port ${PORT}`);
    });

    server.on('error', (error) => {
      console.error("[express] Server error:", error);
      process.exit(1);
    });
  })
  .catch(err => {
    console.error("[express] Database connection failed:", err);
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error("[express] Uncaught Exception:", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[express] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});