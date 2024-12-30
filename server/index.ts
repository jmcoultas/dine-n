import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { sql } from "drizzle-orm";

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

async function startServer() {
  try {
    // Verify database connection first
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    const dbUrlForLogs = process.env.DATABASE_URL.split("@")[1] || "database";
    log("Starting server with database URL: " + dbUrlForLogs);

    // Initialize database connection
    const { db } = await import("../db");
    try {
      await db.execute(sql`SELECT 1`);
      log("Database connection successful");
    } catch (error) {
      log("Database connection failed");
      console.error("Database error details:", error);
      throw error;
    }

    const app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // CORS middleware - updated to be more permissive in development
    app.use((req, res, next) => {
      // Allow both localhost and 0.0.0.0
      const allowedOrigins = ['http://localhost:5173', 'http://0.0.0.0:5173'];
      const origin = req.headers.origin;

      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }

      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");

      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      next();
    });

    // Set up authentication before routes
    await setupAuth(app);

    // Register API routes
    registerRoutes(app);

    const server = createServer(app);

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ error: "Server Error", message });
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Critical server error:", error);
  process.exit(1);
});