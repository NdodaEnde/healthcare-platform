import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "You must be logged in to accept an invitation" },
        { status: 401 }
      );
    }

    // Verify the invitation is valid
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select(`
        id,
        email,
        organization_id,
        role_id,
        accepted,
        expires_at,
        organizations (
          id,
          name
        )
      `)
      .eq("token", token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired invitation" },
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

    // Check if the invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, message: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if the invitation email matches the authenticated user
    // Note: In some cases you might want to allow accepting invitations for any email,
    // but this is a common security measure
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Accept the invitation
    const { data: accepted, error: acceptError } = await supabase
      .rpc("accept_invitation", {
        p_token: token,
        p_user_id: session.user.id
      });

    if (acceptError || !accepted) {
      return NextResponse.json(
        { success: false, message: "Failed to accept invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      organization: {
        id: invitation.organizations.id,
        name: invitation.organizations.name
      }
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      },
      { status: 500 }
    );
  }
}