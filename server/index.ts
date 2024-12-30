import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";
import { db } from "../db";
import { sql } from "drizzle-orm";

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  try {
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");

    // Set up authentication
    await setupAuth(app);

    // Register routes
    registerRoutes(app);

    const server = createServer(app);

    // Error handling middleware
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      res.status(500).json({ error: "Internal Server Error" });
    });

    // Setup Vite in development mode
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    throw error;
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Critical server error:", error);
  process.exit(1);
});