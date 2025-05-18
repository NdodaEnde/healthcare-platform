import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// DELETE - Revoke an invitation
export async function DELETE(
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

    // Get the invitation to check organization and verify the user has permission
    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .select("organization_id")
      .eq("id", invitationId)
      .single();

    if (invitationError) {
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
        { success: false, message: "You don't have permission to revoke invitations for this organization" },
        { status: 403 }
      );
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from("invitations")
      .delete()
      .eq("id", invitationId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Invitation revoked successfully"
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