import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'

// Set up CORS headers for the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the request body
    const { email, password, fullName, organizationName, organizationType } = await req.json()
    
    // Validate input
    if (!email || !password || !fullName) {
      throw new Error('Email, password, and full name are required')
    }

    // Create a Supabase client with the service role key (admin privileges)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Step 1: Create the user account
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Require email confirmation
      user_metadata: {
        full_name: fullName,
      },
    })

    if (userError) throw userError

    console.log('User created:', userData.user.id)

    // Step 2: Update the user's profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userData.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      // Non-fatal - continue with signup
    }

    // Step 3: Create an organization for the user
    const orgName = organizationName || `${fullName}'s Organization`;
    
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert([
        {
          name: orgName,
          organization_type: organizationType || 'direct_client',
          created_by: userData.user.id,
        },
      ])
      .select()

    if (orgError) throw orgError

    console.log('Organization created:', orgData[0].id)

    // Return success response with user and organization data
    return new Response(
      JSON.stringify({
        user: userData.user,
        organization: orgData[0],
        message: 'User registered successfully. Please check your email for confirmation.',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error in sign-up function:', error)
    
    // Return error response
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred during signup',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  }
})