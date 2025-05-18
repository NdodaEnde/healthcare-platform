#!/usr/bin/env node

/**
 * Simple script to apply migrations to Supabase
 * 
 * Usage:
 * 1. Set SUPABASE_URL and SUPABASE_KEY environment variables
 * 2. Run: node apply-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Where to find migrations
const MIGRATIONS_DIR = path.join(__dirname, 'supabase', 'migrations');

// Special migration for invitation system
const INVITATION_SYSTEM_SQL = path.join(MIGRATIONS_DIR, 'combined_invitations_setup.sql');

// Simple function to check if the file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Function to print a colored message
function print(message, color = 'white') {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Main function to apply migrations
function applyMigrations() {
  print('SurgiScan Database Migration Helper', 'cyan');
  print('================================\n', 'cyan');
  
  // Check if the migrations directory exists
  if (!fileExists(MIGRATIONS_DIR)) {
    print(`Error: Migrations directory not found: ${MIGRATIONS_DIR}`, 'red');
    print('\nPlease make sure you are running this script from the project root.', 'yellow');
    process.exit(1);
  }
  
  // Check if we have the special invitation system SQL
  if (!fileExists(INVITATION_SYSTEM_SQL)) {
    print(`Error: Invitation system SQL file not found: ${INVITATION_SYSTEM_SQL}`, 'red');
    process.exit(1);
  }
  
  print('The invitation system requires a properly configured database.', 'yellow');
  print('This script will help you understand what needs to be done.\n', 'yellow');
  
  // Check if Supabase CLI is available
  let hasSupabaseCLI = false;
  try {
    execSync('supabase --version', { stdio: 'ignore' });
    hasSupabaseCLI = true;
  } catch (err) {
    // Supabase CLI not available
  }
  
  if (hasSupabaseCLI) {
    print('✅ Supabase CLI is installed!', 'green');
    print('\nYou can apply migrations using the Supabase CLI:', 'yellow');
    print('\n  supabase db push', 'cyan');
    print('\nMake sure your project is properly linked first:', 'yellow');
    print('\n  supabase link --project-ref your-project-ref', 'cyan');
  } else {
    print('⚠️ Supabase CLI not found', 'yellow');
  }
  
  // Show SQL file content
  print('\n1. Manual SQL Application', 'magenta');
  print('======================\n', 'magenta');
  
  print('To apply the migrations manually:\n', 'yellow');
  print('1. Go to https://app.supabase.com', 'cyan');
  print('2. Select your project', 'cyan');
  print('3. Go to the SQL Editor', 'cyan');
  print('4. Create a new query', 'cyan');
  print('5. Copy and paste the SQL below', 'cyan');
  print('6. Run the query\n', 'cyan');
  
  // Show the first 20 lines of the SQL file
  print('Preview of SQL to run (first 20 lines):', 'yellow');
  const sql = fs.readFileSync(INVITATION_SYSTEM_SQL, 'utf8');
  const sqlLines = sql.split('\n');
  print('\n' + sqlLines.slice(0, 20).join('\n'), 'white');
  print('\n... [truncated] ...\n', 'white');
  
  print(`Complete SQL file available at: ${INVITATION_SYSTEM_SQL}`, 'cyan');
  print('\nThis SQL will create all necessary tables and functions for the invitation system.', 'green');
}

// Run the main function
applyMigrations();