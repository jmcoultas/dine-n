import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { sql } from "drizzle-orm";
import { db } from "../db";
import path from "path";
import fs from "fs-extra";

const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT) || 5000;

// Ensure storage directories exist
const STORAGE_DIR = path.join(process.cwd(), 'storage');
const RECIPES_STORAGE = path.join(STORAGE_DIR, 'recipes');

try {
  fs.ensureDirSync(STORAGE_DIR);
  fs.ensureDirSync(RECIPES_STORAGE);
  console.log('[express] Storage directories initialized:', {
    storage: STORAGE_DIR,
    recipes: RECIPES_STORAGE
  });
} catch (error) {
  console.error('[express] Failed to initialize storage directories:', error);
  process.exit(1);
}

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from storage directory
app.use('/storage', express.static(STORAGE_DIR, {
  fallthrough: true,
  maxAge: '1h'
}));

// Development CORS settings
app.use((req, res, next) => {
  const clientUrl = process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : 'http://localhost:5173';

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

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[express] Server error:', err);
      res.status(500).json({ error: "Server Error", message: err.message });
    });

    // Kill any existing process using our port
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`[express] Port ${PORT} is in use, trying to force close...`);
        require('child_process').exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (err: any) => {
          if (err) {
            console.error('[express] Could not kill process:', err);
            process.exit(1);
          }
          // Retry starting the server after a brief delay
          setTimeout(() => {
            server.listen(PORT, "0.0.0.0", () => {
              console.log(`[express] Server running on port ${PORT}`);
              console.log(`[express] Static files served from ${STORAGE_DIR}`);
            });
          }, 1000);
        });
      } else {
        console.error("[express] Server error:", error);
        process.exit(1);
      }
    });

    // Initial server start
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[express] Server running on port ${PORT}`);
      console.log(`[express] Static files served from ${STORAGE_DIR}`);
    });

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