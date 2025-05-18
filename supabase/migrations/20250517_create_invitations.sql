-- Create an invitations table to store invitation data
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES system_roles(id), -- Changed to TEXT to match system_roles.id type
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE, -- A unique token for the invitation link
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'), -- Invitation expires in 7 days
  accepted BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ,
  
  -- Enforce uniqueness of email per organization
  UNIQUE(organization_id, email)
);

-- Create an index on token for faster lookups
CREATE INDEX IF NOT EXISTS invitations_token_idx ON invitations(token);

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

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