#!/bin/bash
set -e

echo "🧹 Cleaning deployment environment..."

# Force remove node_modules with retries
if [ -d "node_modules" ]; then
  echo "Removing node_modules..."
  rm -rf node_modules || true
  # Double check it's gone
  if [ -d "node_modules/shadcn-ui" ]; then
    echo "Force removing shadcn-ui..."
    chmod -R 777 node_modules/shadcn-ui || true
    rm -rf node_modules/shadcn-ui || true
  fi
  # Final cleanup
  rm -rf node_modules || true
fi

# Remove package-lock to force fresh install
if [ -f "package-lock.json" ]; then
  echo "Removing package-lock.json..."
  rm -f package-lock.json
fi

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

echo "✅ Cleanup complete! Installing dependencies..."

# Fresh install
npm install --no-optional --legacy-peer-deps

echo "✅ Dependencies installed successfully!"
