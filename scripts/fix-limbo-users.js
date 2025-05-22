#!/usr/bin/env node

/**
 * Script to fix users who are in "limbo" - they exist in Firebase but not in our database.
 * Run with: node scripts/fix-limbo-users.js
 */

const { execSync } = require('child_process');
const path = require('path');

// Simple self-executing function to provide async capability
(async function() {
  console.log('Starting fix-limbo-users script...');
  
  try {
    // Import server code 
    const serverDir = path.join(__dirname, '../server');
    
    // Run the script using ts-node
    console.log('Executing the fixLimboUsers function...');
    execSync(`npx ts-node -r tsconfig-paths/register ${path.join(serverDir, 'jobs/fixLimboUsers.ts')}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('Limbo users fix completed successfully');
  } catch (error) {
    console.error('Error running fix-limbo-users script:', error);
    process.exit(1);
  }
})(); 