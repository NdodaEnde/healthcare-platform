import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// PATCH - Change a member's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const body = await request.json();
    const { roleId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "Organization ID is required" },
        { status: 400 }
      );
    }

    if (!roleId) {
      return NextResponse.json(
        { success: false, message: "Role ID is required" },
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
        { success: false, message: "You don't have permission to change roles in this organization" },
        { status: 403 }
      );
    }

    // Check if the role is valid
    const { data: role, error: roleError } = await supabase
      .from("system_roles")
      .select("id, name")
      .eq("id", roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { success: false, message: "Invalid role" },
        { status: 400 }
      );
    }

    // Special handling: Only an owner can assign or remove owner role
    if (role.name === "Owner" && userRole.system_roles.name !== "Owner") {
      return NextResponse.json(
        { success: false, message: "Only owners can assign owner role" },
        { status: 403 }
      );
    }

    // Check if the targeted user exists in the organization
    const { data: memberRole, error: memberRoleError } = await supabase
      .from("user_organizations")
      .select("id, role_id, system_roles(name)")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .single();

    if (memberRoleError || !memberRole) {
      return NextResponse.json(
        { success: false, message: "Member not found in this organization" },
        { status: 404 }
      );
    }

    // Prevent demoting the last owner
    if (
      memberRole.system_roles.name === "Owner" && 
      role.name !== "Owner"
    ) {
      // Check if this is the only owner
      const { data: owners, error: ownersError } = await supabase
        .from("user_organizations")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role_id", memberRole.role_id);

      if (ownersError) {
        return NextResponse.json(
          { success: false, message: ownersError.message },
          { status: 500 }
        );
      }

      if (owners.length === 1 && owners[0].user_id === userId) {
        return NextResponse.json(
          { success: false, message: "Cannot change role of the only owner" },
          { status: 400 }
        );
      }
    }

    // Update the member's role
    const { error: updateError } = await supabase
      .from("user_organizations")
      .update({ role_id: roleId })
      .eq("user_id", userId)
      .eq("organization_id", organizationId);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Role updated successfully"
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      },
      { status: 500 }
    );
  }
}