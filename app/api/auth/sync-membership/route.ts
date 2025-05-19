import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get user metadata to check organization
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: "Failed to get user data", error: userError?.message },
        { status: 500 }
      );
    }
    
    // Extract organization data from user metadata - CHANGE THIS LINE
    // Instead of looking for organizationId, look for active_organization_id
    let organizationId = user.user_metadata?.active_organization_id;
    const role = user.user_metadata?.role || 'member'; // Default to member if no role specified
    
    // ADD FALLBACK LOGIC HERE
    if (!organizationId) {
      console.log("No organization ID in metadata, attempting to find user organizations");
      
      // Try to find user's organizations
      const { data: userOrgs, error: userOrgError } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);
        
      if (userOrgError) {
        console.error("Error fetching user organizations:", userOrgError);
        return NextResponse.json(
          { success: false, message: "Error fetching user organizations", error: userOrgError.message },
          { status: 500 }
        );
      }
      
      if (!userOrgs || userOrgs.length === 0) {
        console.log("No organizations found for user");
        return NextResponse.json(
          { success: false, message: "No organization ID found in user metadata and no organizations linked to user" },
          { status: 400 }
        );
      }
      
      // Use the first organization from the query
      organizationId = userOrgs[0].organization_id;
      console.log(`Found organization ID: ${organizationId}, updating user metadata`);
      
      // Update user metadata with the found organization ID
      const { error: updateError } = await supabase.auth.updateUser({
        data: { active_organization_id: organizationId }
      });
      
      if (updateError) {
        console.error("Failed to update user metadata:", updateError);
        // Continue anyway since we have the organization ID
      } else {
        console.log("Successfully updated user metadata with organization ID");
      }
    }
    
    // Check if the user already has a membership
    // ALSO UPDATE THE TABLE NAME FROM organization_members TO user_organizations
    const { data: existingMembership, error: existingError } = await supabase
      .from("user_organizations") // Changed from organization_members
      .select("*")
      .eq("user_id", session.user.id)
      .eq("organization_id", organizationId)
      .single();
    
    if (existingMembership) {
      return NextResponse.json({
        success: true,
        message: "User is already a member of this organization",
        membership: existingMembership
      });
    }
    
    // Create new membership record
    // ALSO UPDATE THE TABLE NAME HERE
    const { data: membershipData, error: membershipError } = await supabase
      .from("user_organizations") // Changed from organization_members
      .insert([
        {
          user_id: session.user.id,
          organization_id: organizationId,
          role_id: role === 'admin' ? 1 : 2 // Assuming 1 = admin, 2 = member
        }
      ])
      .select()
      .single();
    
    if (membershipError) {
      console.error("Failed to create membership:", membershipError);
      return NextResponse.json(
        { success: false, message: "Failed to create organization membership", error: membershipError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Organization membership created successfully",
      membership: membershipData
    });
  } catch (error) {
    console.error("Sync membership error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}