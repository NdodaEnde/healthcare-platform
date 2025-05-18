import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, invitationToken, organizationId, roleId } = await request.json();

    // Validate input
    if (!email || !password || !fullName || !invitationToken) {
      return NextResponse.json(
        { success: false, message: "Email, password, full name, and invitation token are required" },
        { status: 400 }
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

    // 1. First, validate that the invitation exists and is valid
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
        accepted_at
      `)
      .eq("token", invitationToken)
      .single();

    if (invitationError || !invitation) {
      console.error("Error validating invitation:", invitationError);
      return NextResponse.json(
        { success: false, message: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // 2. Verify the email matches the invitation
    if (invitation.email !== email) {
      return NextResponse.json(
        { success: false, message: "Email address does not match the invitation" },
        { status: 400 }
      );
    }

    if (invitation.accepted) {
      return NextResponse.json(
        { success: false, message: "Invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Get the organization name
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", invitation.organization_id)
      .single();
    
    // Get the role name
    const { data: role, error: roleError } = await supabaseAdmin
      .from("system_roles")
      .select("name")
      .eq("id", invitation.role_id)
      .single();

    // 3. Create the user account
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for invited users
      user_metadata: {
        full_name: fullName,
        // Store the invitation info so we can process it on first login
        invitation_token: invitationToken,
        invited_organization_id: invitation.organization_id,
        organization_name: organization?.name || "Unknown Organization",
        role_name: role?.name || "Member"
      }
    });

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { success: false, message: userError.message },
        { status: 500 }
      );
    }

    console.log("User created successfully:", userData.user.id);

    // 4. Add the user to the organization with the specified role
    const { error: orgError } = await supabaseAdmin
      .from("user_organizations")
      .insert({
        user_id: userData.user.id,
        organization_id: invitation.organization_id,
        role_id: invitation.role_id
      });

    if (orgError) {
      console.error("Error adding user to organization:", orgError);
      return NextResponse.json(
        { success: false, message: "Failed to add user to organization" },
        { status: 500 }
      );
    }

    // 5. Mark the invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from("invitations")
      .update({
        accepted: true,
        accepted_at: new Date().toISOString()
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Error marking invitation as accepted:", updateError);
      // Non-critical error, continue
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Account created and invitation accepted",
      user_id: userData.user.id,
      organization_id: invitation.organization_id
    });

  } catch (error) {
    console.error("Unexpected error in invited-signup:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}