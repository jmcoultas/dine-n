import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { sql } from "drizzle-orm";
import { db } from "../db";
import authRoutes from './routes/auth';
import { verifyAuth } from './middleware/auth';
import recipeRoutes from './routes/recipes';
import mealPlanRoutes from './routes/meal-plans';
import groceryListRoutes from './routes/grocery-lists';

const app = express();
const server = createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Webhook endpoint needs raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  console.log('🎯 Webhook request received');
  next();
});

// Other routes can use JSON parsing
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: false }));

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

    // Use the new auth routes
    app.use('/api', authRoutes);

    // Protected routes should use verifyAuth middleware
    app.use('/api/recipes', verifyAuth, recipeRoutes);
    app.use('/api/meal-plans', verifyAuth, mealPlanRoutes);
    app.use('/api/grocery-lists', verifyAuth, groceryListRoutes);

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

    // Start HTTP server with retry mechanism
    const startHttpServer = () => {
      server.listen(PORT, "0.0.0.0", () => {
        console.log(`[express] Server running on port ${PORT}`);
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`[express] Port ${PORT} is already in use. Retrying...`);
          setTimeout(() => {
            server.close();
            startHttpServer();
          }, 1000);
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