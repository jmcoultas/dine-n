import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      const template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Add security headers middleware
  app.use((req, res, next) => {
    // Prevent browsers from interpreting files as a different MIME type
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent embedding in iframes on other domains
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Enable XSS protection in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent all asset access from other domains
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    
    // Disable source map access in production
    if (process.env.NODE_ENV === 'production' && req.path.endsWith('.map')) {
      return res.status(404).send('Not found');
    }
    
    next();
  });

  // Add cache control for static assets
  app.use(express.static(distPath, {
    etag: true, // Enable ETag for caching
    lastModified: true, // Enable Last-Modified for caching
    setHeaders: (res, path) => {
      // Set long cache for images
      if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif') || path.endsWith('.svg')) {
        // Cache for 1 week (604800 seconds)
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      } else if (path.endsWith('.css') || path.endsWith('.js')) {
        // Cache for 1 day (86400 seconds)
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else {
        // Default cache for 2 hours (7200 seconds)
        res.setHeader('Cache-Control', 'public, max-age=7200');
      }
      
      // Add security headers for static assets
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
