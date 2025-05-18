import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Function to send an invitation email (simulated for now)
async function sendInvitationEmail(
  email: string,
  organizationName: string,
  invitedByName: string,
  invitationLink: string
) {
  console.log(`Resending invitation email to ${email}`);
  console.log(`Organization: ${organizationName}`);
  console.log(`Invited by: ${invitedByName}`);
  console.log(`Invitation link: ${invitationLink}`);
  
  // For demonstration purposes, we'll just return true
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invitationId = params.id;

    if (!invitationId) {
      return NextResponse.json(
        { success: false, message: "Invitation ID is required" },
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

    // Try to use the resend_invitation function if it exists
    const { data: resendResult, error: resendError } = await supabase
      .rpc("resend_invitation", { p_invitation_id: invitationId });

    // If the function exists and worked, use it
    if (!resendError && resendResult === true) {
      // Get invitation details to send the email
      const { data: invitation, error: invitationError } = await supabase
        .from("invitations")
        .select(`
          email,
          organization_id,
          token,
          organizations (name)
        `)
        .eq("id", invitationId)
        .single();

      if (invitationError || !invitation) {
        return NextResponse.json(
          { success: false, message: "Invitation not found" },
          { status: 404 }
        );
      }

      // Create the invitation link
      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${invitation.token}`;

      // Send the invitation email
      await sendInvitationEmail(
        invitation.email,
        invitation.organizations.name,
        session.user.user_metadata?.full_name || "Administrator",
        invitationLink
      );

      return NextResponse.json({
        success: true,
        message: "Invitation resent successfully",
      });
    }

    // If the function doesn't exist or failed, fall back to direct update
    console.log("Function error or failed, falling back to direct update:", resendError);

    // Get the invitation details
    const { data: invitation, error: getError } = await supabase
      .from("invitations")
      .select(`
        id,
        email,
        organization_id,
        token,
        accepted,
        organizations (name)
      `)
      .eq("id", invitationId)
      .single();

    if (getError || !invitation) {
      return NextResponse.json(
        { success: false, message: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if the invitation has already been accepted
    if (invitation.accepted) {
      return NextResponse.json(
        { success: false, message: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Update the invitation's expiration date
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      })
      .eq("id", invitationId)
      .eq("accepted", false);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: "Failed to resend invitation" },
        { status: 500 }
      );
    }

    // Create the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations/accept?token=${invitation.token}`;

    // Send the invitation email
    await sendInvitationEmail(
      invitation.email,
      invitation.organizations.name,
      session.user.user_metadata?.full_name || "Administrator",
      invitationLink
    );

    return NextResponse.json({
      success: true,
      message: "Invitation resent successfully",
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