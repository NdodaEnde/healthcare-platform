import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      );
    }

    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Create a service role client for operations that need elevated permissions
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

    // Try to validate the invitation using the service role client
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("invitations")
      .select(`
        id,
        email,
        organization_id,
        role_id,
        invited_by,
        created_at,
        expires_at,
        accepted,
        accepted_at,
        organizations (name),
        system_roles (name)
      `)
      .eq("token", token)
      .single();

    if (invitationError) {
      console.error("Error validating invitation:", invitationError);
      return NextResponse.json(
        { success: false, message: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.accepted) {
      return NextResponse.json(
        { success: false, message: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      return NextResponse.json(
        { success: false, message: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Get the inviter's name if available
    let inviterName = "A team member";
    if (invitation.invited_by) {
      const { data: inviter } = await supabaseAdmin.auth.admin.getUserById(
        invitation.invited_by
      );
      if (inviter && inviter.user) {
        inviterName = inviter.user.user_metadata?.full_name || inviter.user.email || "A team member";
      }
    }

    // Format the invitation data for the response
    const formattedInvitation = {
      id: invitation.id,
      email: invitation.email,
      organization_id: invitation.organization_id,
      organization_name: invitation.organizations?.name || "Organization",
      role_id: invitation.role_id,
      role_name: invitation.system_roles?.name || "Member",
      invited_by: invitation.invited_by,
      invited_by_name: inviterName,
      created_at: invitation.created_at,
      expires_at: invitation.expires_at
    };

    return NextResponse.json({
      success: true,
      invitation: formattedInvitation
    });
  } catch (error) {
    console.error("Unexpected error validating invitation:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}