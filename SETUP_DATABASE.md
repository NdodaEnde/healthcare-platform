# Setting Up the Database for SurgiScan

This document explains how to set up the database schema for the SurgiScan application, particularly focusing on the invitation system.

## Prerequisites

1. Access to your Supabase project.
2. Administrator privileges to execute SQL in the Supabase dashboard.

## How to Apply the Migrations

### Option 1: Using the Supabase Dashboard (Recommended)

1. Log in to the [Supabase Dashboard](https://app.supabase.com/).
2. Select your project.
3. Navigate to the SQL Editor (click on "SQL Editor" in the left sidebar).
4. Create a new query.
5. Copy the entire contents of `/supabase/migrations/combined_invitations_setup.sql`.
6. Paste it into the SQL Editor.
7. Click "Run" to execute the SQL and create all the necessary tables and functions.

### Option 2: Using the Migration Helper Script

We've created a helper script to assist with migrations:

1. Open your terminal.
2. Navigate to the project root directory.
3. Run the migration helper:
   ```bash
   node run-migrations.js
   ```
4. Follow the prompts to view the SQL that needs to be executed.
5. The script will show you the SQL queries, which you can then copy and paste into the Supabase dashboard SQL Editor.

### Option 3: Using the Supabase CLI (Advanced)

If you have the Supabase CLI installed and configured:

1. Make sure you're authenticated with Supabase:
   ```bash
   supabase login
   ```
2. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
3. Push the migrations:
   ```bash
   supabase db push
   ```

## Verifying the Setup

After applying the migrations, you should verify that everything was created correctly:

1. Go to the Supabase Dashboard.
2. Click on "Table Editor" in the left sidebar.
3. You should see the following tables:
   - `system_roles`
   - `organizations`
   - `user_organizations`
   - `invitations`
4. Check the SQL functions by going to "Database" → "Functions" in the sidebar.
   You should see the following functions:
   - `get_schema_definition`
   - `execute_sql`
   - `generate_invitation_token`
   - `accept_invitation`
   - `get_invitation_by_token`
   - `resend_invitation`
   - `revoke_invitation`

## Troubleshooting

If you encounter errors during the migration:

1. **SQL syntax errors**: These usually indicate a problem with the SQL script. Check the error message for details on which line is causing the problem.

2. **Permission errors**: Make sure you're using an account with sufficient privileges (service role or higher).

3. **Table already exists**: This is usually harmless as our migrations use `CREATE TABLE IF NOT EXISTS`, but if you're seeing other conflicts, you might need to drop and recreate the tables.

4. **Function creation errors**: If you see errors about function signatures, it might be due to conflicts with existing functions. Try dropping the functions before recreating them.

## Manual Table Creation

If you're still having trouble, you can create the tables manually one by one:

1. First, create the `system_roles` table.
2. Then, create the `organizations` table.
3. Next, create the `user_organizations` table (this depends on both auth.users and organizations).
4. Finally, create the `invitations` table (this depends on all previous tables).
5. Create each of the required functions.

Each of these steps is included in the combined SQL file, and you can extract just the parts you need.

## Need Help?

If you continue to experience issues setting up the database:

1. Check the application console logs for specific error messages.
2. Look at the Supabase project logs for any SQL errors.
3. Contact the development team with details of the error you're encountering.

Remember: The invitation system will not work properly until all the required tables and functions are successfully created in the database.