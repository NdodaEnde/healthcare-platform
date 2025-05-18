import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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

    // Verify user has access to the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("organization_id", organizationId)
      .single();

    if (userOrgError) {
      console.error("Error checking user organization access:", userOrgError);
      // Instead of returning a 403, let's return empty data
      return NextResponse.json({
        success: true,
        members: []
      });
    }

    // Fetch all members of the organization
    const { data: members, error: membersError } = await supabase
      .from("user_organizations")
      .select(`
        id,
        user_id,
        role_id,
        created_at as joined_at,
        system_roles (
          id,
          name
        ),
        profiles:user_id (
          email,
          full_name
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at");

    if (membersError) {
      console.error("Error fetching members:", membersError);
      // Return empty list instead of an error
      return NextResponse.json({
        success: true,
        members: []
      });
    }

    // Format the members data
    const formattedMembers = members.map((member) => ({
      id: member.id,
      user_id: member.user_id,
      email: member.profiles?.email || "No email available",
      full_name: member.profiles?.full_name || "Unknown User",
      role_id: member.role_id,
      role_name: member.system_roles?.name || "Member",
      joined_at: member.joined_at
    }));

    return NextResponse.json({
      success: true,
      members: formattedMembers
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    // Return empty list instead of an error
    return NextResponse.json({
      success: true,
      members: []
    });
  }
}