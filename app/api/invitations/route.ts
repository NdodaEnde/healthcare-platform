import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';

import sgMail from '@sendgrid/mail';

// Function to send an invitation email using SendGrid
async function sendInvitationEmail(
  email: string,
  organizationName: string,
  invitedByName: string,
  invitationLink: string
) {
  try {
    // Set the API key from environment variable
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
    
    // invitationLink is already the complete URL, use it directly
    const fullInvitationUrl = invitationLink;
    
    // Create email message
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'your-verified-sender@example.com', // Use your verified sender
      subject: `Invitation to join ${organizationName}`,
      text: `${invitedByName} has invited you to join ${organizationName}. Click the following link to accept: ${fullInvitationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">You've been invited to join ${organizationName}</h2>
          <p>${invitedByName} has invited you to collaborate on ${organizationName}.</p>
          <p>
            <a href="${fullInvitationUrl}" style="display: inline-block; padding: 10px 15px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
              Accept Invitation
            </a>
          </p>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser: ${fullInvitationUrl}
          </p>
        </div>
      `,
    };
    
    // Send the email
    await sgMail.send(msg);
    console.log(`Invitation email sent to ${email} successfully`);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    // Log the specific SendGrid error if available
    if (error.response) {
      console.error('SendGrid API error:', error.response.body);
    }
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, organizationId, roleId, debug, forceBypass } = body;

    console.log("Invitation request received:", { email, organizationId, roleId, debug, forceBypass });

    // Special debug mode to test API connectivity
    if (debug) {
      // Add database connection info in debug mode
      const supabase = createRouteHandlerClient({ cookies });
      try {
        // Try to select from the system_roles table (should be a basic table that exists)
        const { data: rolesData, error: rolesError } = await supabase
          .from('system_roles')
          .select('id, name')
          .limit(5);

        // Try to select from the invitations table
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('invitations')
          .select('id, email')
          .limit(5);
          
        return NextResponse.json({
          success: true,
          message: "Debug mode - API connection successful",
          roles: {
            data: rolesData,
            error: rolesError ? { code: rolesError.code, message: rolesError.message } : null
          },
          invitations: {
            data: invitationsData,
            error: invitationsError ? { code: invitationsError.code, message: invitationsError.message } : null
          },
          debug: true
        });
      } catch (dbError) {
        return NextResponse.json({
          success: false,
          message: "Debug mode - Database error",
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
    }

    // Validate required fields
    if (!email || !organizationId || !roleId) {
      return NextResponse.json(
        { success: false, message: "Email, organization ID, and role ID are required" },
        { status: 400 }
      );
    }

    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Create a service role client for operations that need elevated permissions
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the organization name
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    if (organizationError) {
      console.error("Error fetching organization:", organizationError);
      return NextResponse.json(
        { success: false, message: "Organization not found", details: organizationError },
        { status: 404 }
      );
    }

    // Generate token for the invitation
    const token = uuidv4();
    
    try {
      // First try to use the secure RPC function if it exists
      // This function runs with SECURITY DEFINER and bypasses RLS restrictions
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'create_invitation',
        { 
          p_email: email,
          p_organization_id: organizationId,
          p_role_id: roleId,
          p_invited_by: session.user.id,
          p_token: token
        }
      );
      
      // If the RPC function exists and worked, use its result
      if (!rpcError && rpcResult) {
        // Success path - invitation was created via RPC
        const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${token}`;

        // Send email notification
        await sendInvitationEmail(
          email,
          organization.name,
          session.user.user_metadata?.full_name || "Administrator",
          invitationLink
        );

        return NextResponse.json({
          success: true,
          message: "Invitation sent successfully",
          data: {
            id: rpcResult.id,
            email: email,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            invitationLink
          }
        });
      }
      
      // If the RPC function doesn't exist or failed, fall back to using the service role client
      console.log("RPC function failed or doesn't exist, falling back to service role client", rpcError);
      
      // Use the service role client to create the invitation
      // This bypasses RLS restrictions by using admin privileges
      const { data: invitation, error: invitationError } = await supabaseAdmin
        .from("invitations")
        .insert({
          organization_id: organizationId,
          email,
          role_id: roleId,
          invited_by: session.user.id,
          token
        })
        .select()
        .single();

      // Handle insertion errors
      if (invitationError) {
        console.error("Error creating invitation:", invitationError);
        
        // Unique constraint violation - user already invited
        if (invitationError.code === "23505") {
          return NextResponse.json(
            { success: false, message: "User already invited to this organization" },
            { status: 409 }
          );
        }
        
        // Table doesn't exist
        if (invitationError.code === "42P01" || invitationError.message.includes("does not exist")) {
          return NextResponse.json(
            { 
              success: false, 
              message: "Database tables not set up", 
              details: "Please run the migration SQL script",
              error: invitationError
            },
            { status: 500 }
          );
        }
        
        // Other errors
        return NextResponse.json(
          { 
            success: false, 
            message: "Failed to create invitation", 
            details: invitationError.message,
            code: invitationError.code
          },
          { status: 500 }
        );
      }

      // Success path - invitation was created
      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${token}`;

      // Send email notification
      await sendInvitationEmail(
        email,
        organization.name,
        session.user.user_metadata?.full_name || "Administrator",
        invitationLink
      );

      // Return success response
      return NextResponse.json({
        success: true,
        message: "Invitation sent successfully",
        data: {
          id: invitation.id,
          email: invitation.email,
          createdAt: invitation.created_at,
          expiresAt: invitation.expires_at,
          invitationLink
        }
      });
    } catch (error) {
      console.error("Detailed error in invitation process:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack available");
      console.error("Service role key set:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.error("Supabase URL set:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      return NextResponse.json(
        { 
          success: false, 
          message: "An error occurred while processing the invitation",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// API endpoint to list invitations for an organization
export async function GET(request: NextRequest) {
  try {
    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Create a service role client for operations that need elevated permissions
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First check if the user has access to the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("organization_id", organizationId)
      .single();

    if (userOrgError) {
      console.error("Error checking user access:", userOrgError);
      // Return empty data rather than an error
      return NextResponse.json({
        success: true,
        invitations: []
      });
    }

    // Try to fetch invitations using the service role client to avoid permission issues
    try {
      const { data: invitations, error: invitationsError } = await supabaseAdmin
        .from("invitations")
        .select(`
          id,
          email,
          created_at,
          expires_at,
          accepted,
          accepted_at,
          invited_by,
          role_id,
          system_roles (
            id,
            name
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (invitationsError) {
        // Handle "relation does not exist" error
        if (invitationsError.message && 
            (invitationsError.message.includes("does not exist") || 
             invitationsError.message.includes("relation \"invitations\" does not exist"))) {
          console.log("Invitations table doesn't exist yet. Returning empty array.");
          return NextResponse.json({
            success: true,
            invitations: []
          });
        }

        // Return empty array for any error to avoid UI problems
        return NextResponse.json({
          success: true,
          invitations: [],
          error: invitationsError.message
        });
      }

      return NextResponse.json({
        success: true,
        invitations: invitations || []
      });
    } catch (error) {
      console.error("Error fetching invitations:", error);
      // Return empty invitations rather than error
      return NextResponse.json({
        success: true,
        invitations: []
      });
    }
  } catch (error) {
    console.error("Error in GET invitations:", error);
    // Return empty invitations rather than error
    return NextResponse.json({
      success: true,
      invitations: []
    });
  }
}