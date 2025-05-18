#!/usr/bin/env node

/**
 * This script applies database migrations to the Supabase project.
 * Run with: node run-migrations.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// Get Supabase credentials from environment or .env file
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to run SQL file against Supabase
async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const url = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1/` : '';
  
  // For now, just output the SQL to be run
  console.log(`\nWould execute SQL from file: ${path.basename(filePath)}`);
  console.log('---------------------------------------');
  console.log(`${sql.substring(0, 500)}${sql.length > 500 ? '...\n(truncated)' : ''}`);
  console.log('---------------------------------------\n');
  
  return new Promise((resolve) => {
    rl.question(`Run this SQL? (y/n): `, (answer) => {
      if (answer.toLowerCase() === 'y') {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          console.log('\nMissing Supabase credentials. Cannot run SQL automatically.');
          console.log('Please apply the migration manually using the Supabase dashboard SQL editor.\n');
          resolve(false);
        } else {
          console.log('\nThis function is not fully implemented.');
          console.log('Please copy the SQL above and run it in the Supabase dashboard SQL editor.\n');
          resolve(false);
        }
      } else {
        console.log('Skipping this file.');
        resolve(false);
      }
    });
  });
}

// Main function
async function main() {
  console.log('Supabase Migration Helper');
  console.log('========================\n');
  
  if (!SUPABASE_URL) {
    console.log('NEXT_PUBLIC_SUPABASE_URL is not set.');
    console.log('You can still use this script to view migration SQL.\n');
  }
  
  // Read migration files
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (files.length === 0) {
    console.log('No SQL migration files found.');
    process.exit(0);
  }
  
  console.log(`Found ${files.length} SQL migration files:`);
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
  
  // Process each file
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    await runSqlFile(filePath);
  }
  
  console.log('\nMigration process complete.');
  console.log('You can apply these migrations manually using the Supabase dashboard SQL editor.');
  console.log('Navigate to: https://app.supabase.com/project/_/sql');
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});