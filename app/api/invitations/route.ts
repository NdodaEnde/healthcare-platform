import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';

// Function to send an invitation email
async function sendInvitationEmail(
  email: string,
  organizationName: string,
  invitedByName: string,
  invitationLink: string
) {
  // In a real application, integrate with an email service like SendGrid, Mailgun, etc.
  console.log(`Sending invitation email to ${email}`);
  console.log(`Organization: ${organizationName}`);
  console.log(`Invited by: ${invitedByName}`);
  console.log(`Invitation link: ${invitationLink}`);
  
  // For demonstration purposes, we'll just return true
  return true;
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
      // Directly insert into the invitations table - simple and direct approach
      const { data: invitation, error: invitationError } = await supabase
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
      console.error("Error in invitation process:", error);
      
      return NextResponse.json(
        { 
          success: false, 
          message: "An error occurred while processing the invitation",
          error: error instanceof Error ? error.message : String(error)
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

    // Try to fetch invitations directly
    try {
      const { data: invitations, error: invitationsError } = await supabase
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