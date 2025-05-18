import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// DELETE - Remove a member from organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
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
      .eq("organization_id", organizationId)
      .single();

    if (userRoleError || !userRole || (userRole.system_roles.name !== "Admin" && userRole.system_roles.name !== "Owner")) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to remove members from this organization" },
        { status: 403 }
      );
    }

    // Prevent removing yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, message: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    // Check if user is the only owner
    if (userRole.system_roles.name === "Owner") {
      const { data: owners, error: ownersError } = await supabase
        .from("user_organizations")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("role_id", userRole.role_id);

      if (ownersError) {
        return NextResponse.json(
          { success: false, message: ownersError.message },
          { status: 500 }
        );
      }

      if (owners.length === 1 && owners[0].id === session.user.id) {
        return NextResponse.json(
          { success: false, message: "You are the only owner. You cannot remove yourself." },
          { status: 400 }
        );
      }
    }

    // Remove the member from the organization
    const { error: deleteError } = await supabase
      .from("user_organizations")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member removed from organization"
    });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      },
      { status: 500 }
    );
  }
}