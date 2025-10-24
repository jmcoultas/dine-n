#!/bin/bash
set -e

echo "🧹 Cleaning deployment environment..."

# Aggressively remove node_modules
echo "Step 1: Removing node_modules directory..."
rm -rf node_modules 2>/dev/null || true
sleep 1

# Verify it's gone and force remove if still there
if [ -d "node_modules" ]; then
  echo "node_modules still exists, forcing removal..."
  find node_modules -type f -delete 2>/dev/null || true
  find node_modules -type d -delete 2>/dev/null || true
  rm -rf node_modules 2>/dev/null || true
fi

# Remove package-lock.json
echo "Step 2: Removing package-lock.json..."
rm -f package-lock.json

# Clear all npm caches
echo "Step 3: Clearing npm cache..."
npm cache clean --force 2>/dev/null || true
rm -rf ~/.npm 2>/dev/null || true

# Verify package.json doesn't have shadcn-ui
echo "Step 4: Verifying package.json is clean..."
if grep -q "shadcn-ui" package.json; then
  echo "❌ ERROR: shadcn-ui still in package.json!"
  exit 1
else
  echo "✅ package.json is clean"
fi

echo "Step 5: Installing dependencies with npm ci (clean install)..."
# npm ci does a clean install from package-lock.json, ignoring node_modules
# This should bypass the shadcn-ui rename issue entirely
npm ci --prefer-offline=false 2>&1 || {
  echo "npm ci failed, trying npm install as fallback..."
  npm install --prefer-offline=false --no-save --legacy-peer-deps
}

echo "✅ Dependencies installed successfully!"
