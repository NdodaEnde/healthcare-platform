-- Combined SQL migration for invitations system (Fixed version)
-- This file contains ALL required database objects for the invitation system to work

-- First check if system_roles table already exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'system_roles'
  ) THEN
    -- If it exists, just alter it to ensure it has the fields we need
    -- Add description column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'system_roles' 
      AND column_name = 'description'
    ) THEN
      ALTER TABLE system_roles ADD COLUMN description TEXT;
    END IF;
  ELSE
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS system_roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      permissions JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Insert default roles if they don't exist
INSERT INTO system_roles (id, name, description, permissions)
VALUES 
  ('admin', 'Administrator', 'Full access to all features', '["manage:all", "manage:client_organizations"]'::JSONB),
  ('manager', 'Manager', 'Can manage organization resources', '["view:all", "manage:client_organizations", "manage:reports"]'::JSONB),
  ('doctor', 'Doctor', 'Medical practitioner with patient access', '["view:patients", "view:tests", "view:certificates", "approve:certificates", "sign:certificates"]'::JSONB),
  ('nurse', 'Nurse', 'Nursing staff with vitals access', '["view:patients", "create:vitals", "update:vitals", "view:tests"]'::JSONB),
  ('technician', 'Technician', 'Lab technician with test results access', '["view:patients", "create:results", "update:results"]'::JSONB),
  ('receptionist', 'Receptionist', 'Front desk staff with appointments access', '["view:patients", "create:appointments", "update:appointments"]'::JSONB)
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- Create the organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'direct_client',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create the user_organizations junction table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES system_roles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Function to check if a table exists in the database
CREATE OR REPLACE FUNCTION get_schema_definition(table_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Check if the table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = current_schema()
    AND table_name = $1
  ) INTO result;
  
  IF result THEN
    RETURN 'EXISTS';
  ELSE
    RETURN '';
  END IF;
END;
$$;

-- Function to safely execute SQL with proper permissions
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Execute the provided SQL
  EXECUTE sql;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create an invitations table to store invitation data
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES system_roles(id),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  
  -- Enforce uniqueness of email per organization
  UNIQUE(organization_id, email)
);

-- Create an index on token for faster lookups
CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations(token);

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Organization admins can view invitations" ON invitations;
DROP POLICY IF EXISTS "Organization admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Organization admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Organization admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON invitations;

-- Create RLS policies for invitations
-- Allow organization admins to view all invitations for their organization
CREATE POLICY "Organization admins can view invitations" 
  ON invitations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = invitations.organization_id
      AND user_organizations.role_id IN (
        SELECT id FROM system_roles
        WHERE name = 'Administrator' OR name = 'Manager'
      )
    )
  );

-- Allow organization admins to create invitations for their organization
CREATE POLICY "Organization admins can create invitations" 
  ON invitations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = invitations.organization_id
      AND user_organizations.role_id IN (
        SELECT id FROM system_roles
        WHERE name = 'Administrator' OR name = 'Manager'
      )
    )
  );

-- Allow organization admins to update invitations for their organization
CREATE POLICY "Organization admins can update invitations" 
  ON invitations 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = invitations.organization_id
      AND user_organizations.role_id IN (
        SELECT id FROM system_roles
        WHERE name = 'Administrator' OR name = 'Manager'
      )
    )
  );

-- Allow organization admins to delete invitations for their organization
CREATE POLICY "Organization admins can delete invitations" 
  ON invitations 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations
      WHERE user_organizations.user_id = auth.uid()
      AND user_organizations.organization_id = invitations.organization_id
      AND user_organizations.role_id IN (
        SELECT id FROM system_roles
        WHERE name = 'Administrator' OR name = 'Manager'
      )
    )
  );

-- Create a function to generate an invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random token with 32 characters
    token := encode(gen_random_bytes(24), 'hex');
    
    -- Check if the token already exists
    SELECT EXISTS (
      SELECT 1 FROM invitations
      WHERE invitations.token = token
    ) INTO exists;
    
    -- If the token doesn't exist, return it
    IF NOT exists THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$;

-- Create a function to process accepting an invitation
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get the invitation
  SELECT * FROM invitations
  WHERE token = p_token
  AND accepted = false
  AND expires_at > now()
  INTO v_invitation;
  
  -- If the invitation doesn't exist or is expired, return false
  IF v_invitation IS NULL THEN
    RETURN false;
  END IF;
  
  -- Add the user to the organization with the specified role
  INSERT INTO user_organizations(user_id, organization_id, role_id)
  VALUES (p_user_id, v_invitation.organization_id, v_invitation.role_id)
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET role_id = v_invitation.role_id;
  
  -- Mark the invitation as accepted
  UPDATE invitations
  SET accepted = true,
      accepted_at = now()
  WHERE id = v_invitation.id;
  
  RETURN true;
END;
$$;

-- Add an additional policy for organization members to view their own invitations
-- This allows users to check their own invitation status
CREATE POLICY "Users can view their own invitations" 
  ON invitations 
  FOR SELECT 
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add a type-safe function to fetch invitation details by token
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID, 
  organization_id UUID,
  email TEXT,
  role_id TEXT,
  invited_by UUID,
  token TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  accepted BOOLEAN,
  organization_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id, 
    i.organization_id,
    i.email,
    i.role_id,
    i.invited_by,
    i.token,
    i.created_at,
    i.expires_at,
    i.accepted,
    o.name as organization_name
  FROM invitations i
  JOIN organizations o ON i.organization_id = o.id
  WHERE i.token = p_token
  AND i.accepted = false
  AND i.expires_at > now();
END;
$$;

-- Create function to resend an invitation (resets expiration)
CREATE OR REPLACE FUNCTION resend_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if the invitation exists and is not accepted
  SELECT EXISTS (
    SELECT 1 FROM invitations
    WHERE id = p_invitation_id
    AND accepted = false
  ) INTO v_exists;
  
  -- If no valid invitation found, return false
  IF NOT v_exists THEN
    RETURN false;
  END IF;
  
  -- Reset expiration date
  UPDATE invitations
  SET expires_at = now() + interval '7 days'
  WHERE id = p_invitation_id
  AND accepted = false;
  
  RETURN true;
END;
$$;

-- Create a function to revoke an invitation
CREATE OR REPLACE FUNCTION revoke_invitation(p_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if the invitation exists and is not accepted
  SELECT EXISTS (
    SELECT 1 FROM invitations
    WHERE id = p_invitation_id
    AND accepted = false
  ) INTO v_exists;
  
  -- If no valid invitation found, return false
  IF NOT v_exists THEN
    RETURN false;
  END IF;
  
  -- Delete the invitation
  DELETE FROM invitations
  WHERE id = p_invitation_id
  AND accepted = false;
  
  RETURN true;
END;
$$;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_schema_definition(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invitation_token() TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resend_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_invitation(UUID) TO authenticated;