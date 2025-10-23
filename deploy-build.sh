#!/bin/bash
set -e

echo "🧹 Cleaning node_modules..."
rm -rf node_modules

echo "📦 Installing dependencies with npm ci..."
npm ci

echo "🔍 Running TypeScript checks..."
npm run check

echo "🏗️ Building application..."
NODE_ENV=production npx vite build
NODE_ENV=production npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build complete!"
