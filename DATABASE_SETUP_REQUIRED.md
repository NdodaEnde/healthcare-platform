# DATABASE SETUP REQUIRED

## The invitation system requires database configuration!

The invitation system is showing errors because the required database tables and functions are not yet configured. Here's what you need to do:

## Option 1: Using the Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to SQL Editor (in the left sidebar)
4. Create a new query
5. Copy the ENTIRE SQL from: `/supabase/migrations/combined_invitations_setup.sql`
6. Paste it into the SQL Editor
7. Click "Run" to execute the SQL

## Option 2: Using the Migration Helper

We've created a simple script to help with migration:

```bash
node apply-migrations.js
```

This script will provide instructions and preview the SQL that needs to be run.

## Required Database Objects

The invitation system needs the following database objects:

### Tables:
- `system_roles` - Role definitions
- `organizations` - Organization information
- `user_organizations` - Junction table for users and organizations
- `invitations` - Invitation data

### Functions:
- `get_schema_definition` - Checks if tables exist
- `execute_sql` - Allows SQL execution
- `generate_invitation_token` - Creates unique tokens for invitations
- `accept_invitation` - Processes invitation acceptance
- `get_invitation_by_token` - Retrieves invitation details
- `resend_invitation` - Updates invitation expiration
- `revoke_invitation` - Removes invitations

The SQL migration creates all of these objects with the proper structure and permissions.

## Troubleshooting

If you're still seeing errors after applying the migration:

1. Check the browser console for specific error messages
2. Verify that the tables were created in the Supabase Dashboard Table Editor
3. Ensure that Row Level Security (RLS) policies are correctly applied
4. Make sure your user has the correct permissions to access the tables

## Need More Help?

See the more detailed documentation in `/SETUP_DATABASE.md` for additional options and troubleshooting steps.