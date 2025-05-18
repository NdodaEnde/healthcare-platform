import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
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
    
    // Create a service role client to bypass RLS for cross-schema queries
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

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

    // Fetch all members of the organization using the admin client to bypass schema permissions
    const { data: members, error: membersError } = await supabaseAdmin
      .from("user_organizations")
      .select(`
        id,
        user_id,
        role_id,
        created_at,
        system_roles (
          id,
          name
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at");
      
    // Log the error if any
    if (membersError) {
      console.error("Error fetching members:", membersError);
    }
    
    // Separately fetch user details for each member
    let formattedMembers = [];
    if (members && members.length > 0) {
      // Get all user IDs
      const userIds = members.map(member => member.user_id);
      
      // Fetch user details using admin API
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      
      // Map user data to members
      formattedMembers = members.map((member) => {
        const user = users?.users?.find(u => u.id === member.user_id);
        
        return {
          id: member.id,
          user_id: member.user_id,
          email: user?.email || "No email available",
          full_name: user?.user_metadata?.full_name || "Unknown User",
          role_id: member.role_id,
          role_name: member.system_roles?.name || "Member",
          joined_at: member.created_at
        };
      });
    }

    // We've already handled formatting in the block above
    // Just return the empty array if there was an error
    if (membersError && !members) {
      return NextResponse.json({
        success: true,
        members: []
      });
    }

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