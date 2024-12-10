import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import { setupAuth } from "./auth";

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
    // Check database connection first
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    log("Starting server with database URL: " + process.env.DATABASE_URL.split("@")[1]);

    try {
      // Import and verify database connection
      const { db } = await import("../db");
      await db.execute(sql`SELECT 1`);
      log("Database connection successful");
    } catch (error) {
      log("Database connection failed");
      throw error;
    }

    const app = express();
    
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }

          log(logLine);
        }
      });

      next();
    });

    // Set up authentication before routes
    await setupAuth(app);
    
    // Register API routes after auth setup
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

    // Start server
    const PORT = 5000;
    return new Promise((resolve) => {
      server.listen(PORT, "0.0.0.0", () => {
        log(`serving on port ${PORT}`);
        resolve(server);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    if (error instanceof Error) {
      log(`Error: ${error.message}`);
      if (error.stack) {
        log(`Stack trace: ${error.stack}`);
      }
    }
    process.exit(1);
  }
}

// Start the server with error handling
startServer().catch((error) => {
  console.error("Critical server error:", error);
  if (error instanceof Error) {
    log(`Critical Error: ${error.message}`);
    if (error.stack) {
      log(`Stack trace: ${error.stack}`);
    }
  }
  process.exit(1);
});
