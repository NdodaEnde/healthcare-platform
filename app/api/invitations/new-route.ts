import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';

// Function to send an invitation email (simplified for demo)
async function sendInvitationEmail(email: string, organizationName: string, invitedByName: string, invitationLink: string) {
  console.log(`Sending invitation to ${email} for ${organizationName}`);
  console.log(`Invitation link: ${invitationLink}`);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = await request.json();
    const { email, organizationId, roleId } = body;
    
    // Validate inputs
    if (!email || !organizationId || !roleId) {
      return NextResponse.json({ 
        success: false, 
        message: "Email, organization ID, and role ID are required" 
      }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Authenticate user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: "Unauthorized" 
      }, { status: 401 });
    }

    // Get organization name for the email
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();
      
    if (orgError) {
      return NextResponse.json({ 
        success: false, 
        message: "Organization not found" 
      }, { status: 404 });
    }

    // Generate token for the invitation
    const token = uuidv4();
    
    // Direct database operation - insert invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .insert({
        organization_id: organizationId,
        email,
        role_id: roleId,
        invited_by: session.user.id,
        token
      })
      .select("id, email, created_at, expires_at")
      .single();

    // Handle errors specifically
    if (invitationError) {
      // Check error type
      if (invitationError.code === '42P01') {
        // Table doesn't exist error
        return NextResponse.json({
          success: false,
          message: "Database tables not created",
          details: "Please run the migration script to create the invitation tables",
          errorCode: invitationError.code
        }, { status: 500 });
      }
      
      if (invitationError.code === '23505') {
        // Uniqueness constraint violation
        return NextResponse.json({
          success: false,
          message: "User already invited to this organization",
          details: invitationError.message
        }, { status: 409 });
      }
      
      // Other errors
      return NextResponse.json({
        success: false,
        message: "Error creating invitation",
        details: invitationError.message,
        errorCode: invitationError.code
      }, { status: 500 });
    }

    // Success case - invitation created
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${token}`;
    
    // Send invitation email
    await sendInvitationEmail(
      email,
      organization.name,
      session.user.user_metadata?.full_name || "Administrator",
      invitationLink
    );
    
    // Return successful response
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
    console.error("Error sending invitation:", error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "An unknown error occurred"
    }, { status: 500 });
  }
}