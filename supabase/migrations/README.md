# Database Migrations

This directory contains SQL migrations for the Supabase database. These migrations need to be applied to set up the database schema and functions for the Healthcare Platform.

## Applying Migrations

There are two ways to apply the migrations:

### Method 1: Using the Supabase Dashboard

1. Log in to the [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to the SQL Editor
4. Create a new query
5. Copy the contents of each migration file (in order of date) and paste it into the SQL Editor
6. Run the query

### Method 2: Using the Supabase CLI

If you have the Supabase CLI installed and configured, you can run:

```bash
supabase db push
```

This will apply all migrations to the database.

## Migration Files

Apply the migrations in the following order:

1. `20250517_create_invitations.sql` - Creates the invitations table with RLS policies and helper functions
2. `20250518_db_utility_functions.sql` - Creates utility functions for checking schema and executing SQL

## Troubleshooting

If you encounter any issues when applying the migrations:

1. Check if the database already has tables or functions with the same names
2. Look for error messages in the SQL Editor or CLI output
3. Make sure all referenced tables (like `organizations`, `system_roles`, etc.) exist before applying the migrations
4. Ensure your Supabase instance has the required extensions enabled (like `uuid-ossp` for UUID generation)

## Manual Setup

If you need to manually create the database tables in production, you can use the SQL in the migrations directly. The tables required for the invitation system are:

1. `organizations` - Stores organization information
2. `system_roles` - Stores role definitions
3. `user_organizations` - Stores user-organization relationships
4. `invitations` - Stores pending invitations

Each migration uses `CREATE TABLE IF NOT EXISTS` to prevent errors if the tables already exist.

## Functions

The migrations create several database functions:

- `get_schema_definition(table_name TEXT)` - Checks if a table exists
- `execute_sql(sql TEXT)` - Safely executes SQL with proper permissions
- `generate_invitation_token()` - Generates a unique token for invitations
- `accept_invitation(p_token TEXT, p_user_id UUID)` - Processes invitation acceptance
- `get_invitation_by_token(p_token TEXT)` - Retrieves invitation details by token
- `resend_invitation(p_invitation_id UUID)` - Resets the expiration date for an invitation
- `revoke_invitation(p_invitation_id UUID)` - Revokes (deletes) an invitation

These functions are used by the application API to interact with the database securely.