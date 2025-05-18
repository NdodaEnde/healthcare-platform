import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Function to send an invitation email (stub)
async function sendInvitationEmail(
  email: string,
  organizationName: string,
  invitedByName: string,
  invitationLink: string
) {
  // In a real application, integrate with an email service like SendGrid, Mailgun, etc.
  console.log(`Resending invitation email to ${email}`);
  console.log(`Organization: ${organizationName}`);
  console.log(`Invited by: ${invitedByName}`);
  console.log(`Invitation link: ${invitationLink}`);
  
  // For demonstration purposes, we'll just return true
  return true;
}

// POST - Resend an invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitationId = params.id;

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

    // Get the invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(`
        id,
        email,
        token,
        organization_id,
        organizations (
          name
        )
      `)
      .eq("id", invitationId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, message: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify user has admin or owner role in the organization
    const { data: userRole, error: userRoleError } = await supabase
      .from("user_organizations")
      .select(`
        role_id,
        system_roles (
          name
        )
      `)
      .eq("user_id", session.user.id)
      .eq("organization_id", invitation.organization_id)
      .single();

    if (userRoleError || !userRole || (userRole.system_roles.name !== "Admin" && userRole.system_roles.name !== "Owner")) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to resend invitations for this organization" },
        { status: 403 }
      );
    }

    // Update the invitation's expiration date
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .eq("id", invitationId);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    // Get the inviter's name
    const inviterName = session.user.user_metadata?.full_name || "Administrator";

    // Create the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${invitation.token}`;

    // Send the invitation email
    await sendInvitationEmail(
      invitation.email,
      invitation.organizations.name,
      inviterName,
      invitationLink
    );

    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully"
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      },
      { status: 500 }
    );
  }
}