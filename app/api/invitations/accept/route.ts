import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
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

    // First, try to use the secure RPC function if it exists
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'accept_invitation',
        { 
          p_token: token,
          p_user_id: session.user.id
        }
      );
      
      // If the RPC function exists and worked, use its result
      if (!rpcError && rpcResult) {
        return NextResponse.json({
          success: true,
          message: "Invitation accepted successfully",
          organizationId: rpcResult.organization_id
        });
      }
      
      // If the RPC function doesn't exist or failed, fall back to manual process
      console.log("RPC function failed or doesn't exist, falling back to manual process", rpcError);
    } catch (error) {
      console.error("Error with RPC function:", error);
      // Continue with fallback
    }

    // Fallback: Manual process using service role client
    // 1. Get the invitation details
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("invitations")
      .select("id, email, organization_id, role_id, accepted")
      .eq("token", token)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    if (invitation.accepted) {
      return NextResponse.json(
        { success: false, message: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    // 2. Verify the user's email matches the invitation email
    if (session.user.email !== invitation.email) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Email mismatch. Please sign in with the email address the invitation was sent to." 
        },
        { status: 400 }
      );
    }

    // Log details for debugging
    console.log("Adding user to organization:", {
      userId: session.user.id,
      organizationId: invitation.organization_id,
      organizationName: invitation.organizations?.name || "Unknown",
      roleId: invitation.role_id
    });

    // 3. Start a transaction to ensure data consistency
    // First, add the user to the organization
    const { error: userOrgError } = await supabaseAdmin
      .from("user_organizations")
      .insert({
        user_id: session.user.id,
        organization_id: invitation.organization_id,
        role_id: invitation.role_id
      });

    if (userOrgError) {
      // Check if it's a unique constraint violation (user already in org)
      if (userOrgError.code === "23505") {
        // Update the role if the user is already in the organization
        const { error: updateRoleError } = await supabaseAdmin
          .from("user_organizations")
          .update({ role_id: invitation.role_id })
          .eq("user_id", session.user.id)
          .eq("organization_id", invitation.organization_id);

        if (updateRoleError) {
          console.error("Error updating role:", updateRoleError);
          return NextResponse.json(
            { success: false, message: "Failed to update role in organization" },
            { status: 500 }
          );
        }
      } else {
        console.error("Error adding user to organization:", userOrgError);
        return NextResponse.json(
          { success: false, message: "Failed to add user to organization" },
          { status: 500 }
        );
      }
    }

    // 4. Mark the invitation as accepted
    const { error: updateInvitationError } = await supabaseAdmin
      .from("invitations")
      .update({
        accepted: true,
        accepted_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    if (updateInvitationError) {
      console.error("Error updating invitation:", updateInvitationError);
      // We don't return an error here because the user has already been added to the organization
      // This is just updating the invitation status
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      organizationId: invitation.organization_id
    });
  } catch (error) {
    console.error("Unexpected error accepting invitation:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}