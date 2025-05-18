/**
 * This script runs a diagnostic check on your Supabase database for the invitation system
 * 
 * It will help identify any issues with database tables or permissions
 * 
 * Run with:
 *   node debug-database.js
 */

async function runDiagnostic() {
  console.log('SurgiScan Database Diagnostic Tool');
  console.log('================================\n');
  
  console.log('To debug invitation system database issues:');
  console.log('\n1. Copy and paste the following URL in your browser:\n');
  console.log('   http://localhost:3000/api/invitations?debug=true\n');
  
  console.log('2. Or run this curl command to diagnose the issue:\n');
  console.log('   curl -X POST -H "Content-Type: application/json" -d \'{"debug": true}\' http://localhost:3000/api/invitations\n');
  
  console.log('3. To debug table permissions, try finding system_roles:\n');
  console.log('   curl -X POST -H "Content-Type: application/json" -d \'{"debug": true, "checkTable": "system_roles"}\' http://localhost:3000/api/invitations\n');
  
  console.log('4. Check Supabase SQL directly:');
  console.log('   - Go to https://app.supabase.com');
  console.log('   - Open your project');
  console.log('   - Go to SQL Editor');
  console.log('   - Run this query:');
  console.log(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('invitations', 'organizations', 'system_roles', 'user_organizations');
  `);
  
  console.log('\n5. Check if the function permissions are properly set up:');
  console.log(`
      SELECT p.proname AS function_name, 
             pg_catalog.pg_get_userbyid(p.proowner) as owner,
             CASE WHEN p.proisagg THEN 'agg' ELSE 'func' END AS type
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname IN ('accept_invitation', 'get_invitation_by_token', 'get_schema_definition');
  `);
  
  console.log('\n6. To completely bypass database checks and use simulated mode:');
  console.log('   - Update the InviteUserDialog component to use forceBypass=true');
  console.log('\nRemember to check the browser console for detailed error messages!');
}

runDiagnostic();