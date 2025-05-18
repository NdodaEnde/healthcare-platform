import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function DELETE(
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

    // Try to use the revoke_invitation function if it exists
    const { data: revokeResult, error: revokeError } = await supabase
      .rpc("revoke_invitation", { p_invitation_id: invitationId });

    // If the function exists and worked, use it
    if (!revokeError && revokeResult === true) {
      return NextResponse.json({
        success: true,
        message: "Invitation revoked successfully",
      });
    }

    // If the function doesn't exist or failed, fall back to direct delete
    console.log("Function error or failed, falling back to direct delete:", revokeError);

    // First check if the invitation exists and is not accepted
    const { data: invitation, error: getError } = await supabase
      .from("invitations")
      .select("accepted")
      .eq("id", invitationId)
      .single();

    if (getError) {
      return NextResponse.json(
        { success: false, message: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if the invitation has already been accepted
    if (invitation.accepted) {
      return NextResponse.json(
        { success: false, message: "Cannot revoke an accepted invitation" },
        { status: 400 }
      );
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from("invitations")
      .delete()
      .eq("id", invitationId)
      .eq("accepted", false);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: "Failed to revoke invitation", error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation revoked successfully",
    });
  } catch (error) {
    console.error("Error revoking invitation:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      },
      { status: 500 }
    );
  }
}