// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { startExpirationJob } from "./jobs/checkMealPlanExpiration";
import { config } from "./config/environment";

const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// CRITICAL: Register webhook handler FIRST, before ANY other middleware
// This ensures no other middleware can interfere with the raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // Import the webhook handler dynamically to avoid circular imports
  try {
    const { registerWebhookHandler } = await import('./routes');
    await registerWebhookHandler(req, res);
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// IMPORTANT: All other middleware comes AFTER the webhook handler
// This is handled in routes.ts with express.raw({ type: 'application/json' })

// Apply JSON parsing to all routes EXCEPT the webhook endpoint
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    // Skip JSON parsing for webhook endpoint - it needs raw body
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: false }));

// Development CORS settings
app.use((req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || config.clientUrl;

  res.header('Access-Control-Allow-Origin', clientUrl);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Test database connection first
async function startServer() {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    console.log("[express] Database connection successful");

    // Setup authentication
    setupAuth(app);

    // Register routes
    registerRoutes(app);

    // Setup Vite in development mode
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the expiration check job
    startExpirationJob();

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[express] Server error:', err);
      res.status(500).json({ error: "Server Error", message: err.message });
    });

    // Start HTTP server with retry mechanism
    const startHttpServer = () => {
      server.listen(PORT, "0.0.0.0", () => {
        console.log(`[express] Server running on port ${PORT}`);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[express] Port ${PORT} is already in use. Exiting...`);
          process.exit(1);
        } else {
          console.error("[express] Server error:", error);
          process.exit(1);
        }
      });
    };

    startHttpServer();
  } catch (err) {
    console.error("[express] Startup error:", err);
    process.exit(1);
  }
}

// Start server with proper error handling
startServer().catch(err => {
  console.error("[express] Fatal error during startup:", err);
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