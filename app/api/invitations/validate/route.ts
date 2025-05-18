import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Common function to handle both GET and POST requests
async function validateInvitation(token: string) {
  try {
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Invitation token is required" },
        { status: 400 }
      );
    }

    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Try to use the get_invitation_by_token function first
    const { data: invitation, error: functionError } = await supabase
      .rpc("get_invitation_by_token", { p_token: token });

    // If the function exists and returned data, use it
    if (!functionError && invitation) {
      // Get the role name from the system_roles table
      const { data: role, error: roleError } = await supabase
        .from("system_roles")
        .select("name")
        .eq("id", invitation.role_id)
        .single();

      // Format the response
      return NextResponse.json({
        success: true,
        invitation: {
          ...invitation,
          role_name: roleError ? "Team Member" : role.name,
          expired: new Date(invitation.expires_at) < new Date()
        }
      });
    }

    // If the function doesn't exist yet or failed, fall back to direct query
    console.log("Function error or no data, falling back to direct query:", functionError);
    
    // Fetch the invitation details directly
    const { data: directInvitation, error: invitationError } = await supabase
      .from("invitations")
      .select(`
        id,
        email,
        accepted,
        expires_at,
        created_at,
        token,
        role_id,
        organization_id,
        system_roles (
          id,
          name
        ),
        organizations (
          id,
          name
        )
      `)
      .eq("token", token)
      .single();

    if (invitationError || !directInvitation) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if the invitation has already been accepted
    if (directInvitation.accepted) {
      return NextResponse.json(
        { success: false, message: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Check if the invitation has expired
    const isExpired = new Date(directInvitation.expires_at) < new Date();
    if (isExpired) {
      return NextResponse.json(
        { success: false, message: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Format the response to match our expected structure
    return NextResponse.json({
      success: true,
      invitation: {
        id: directInvitation.id,
        organization_id: directInvitation.organization_id,
        email: directInvitation.email,
        role_id: directInvitation.role_id,
        role_name: directInvitation.system_roles?.name || "Team Member",
        expires_at: directInvitation.expires_at,
        created_at: directInvitation.created_at,
        token: directInvitation.token,
        organization_name: directInvitation.organizations?.name || "Organization",
        expired: isExpired
      }
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred"
      },
      { status: 500 }
    );
  }
}

// GET handler for URL query parameters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  return validateInvitation(token || "");
}

// POST handler for JSON request body
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token } = body;
  return validateInvitation(token || "");
}