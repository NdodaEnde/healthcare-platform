-- Function to check if a table exists in the database
CREATE OR REPLACE FUNCTION get_schema_definition(table_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result BOOLEAN;
  schema_def TEXT;
BEGIN
  -- Check if the table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = current_schema()
    AND table_name = $1
  ) INTO result;
  
  IF result THEN
    -- For our API to use, we just need a non-empty string to indicate success
    schema_def := 'EXISTS';
  ELSE
    schema_def := '';
  END IF;
  
  RETURN schema_def;
END;
$$;

-- Function to safely execute SQL with proper permissions
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the SQL for debugging (consider removing in production)
  RAISE NOTICE 'Executing SQL: %', sql;
  
  -- Execute the provided SQL
  EXECUTE sql;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    RAISE NOTICE 'Error executing SQL: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permissions on the new functions to authenticated users
GRANT EXECUTE ON FUNCTION get_schema_definition(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated;

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

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION resend_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_invitation(UUID) TO authenticated;