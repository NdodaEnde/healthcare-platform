import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Create a Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    // Get current user metadata
    const { data: userData } = await supabase.auth.getUser();
    const currentMetadata = userData?.user?.user_metadata || {};
    
    // Add organization info if missing
    let updatedMetadata = { ...currentMetadata };
    
    // Always set role to admin
    updatedMetadata.role = 'admin';
    
    // Set organizationId if missing
    if (!updatedMetadata.organizationId) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .limit(1)
        .single();
        
      if (orgData) {
        updatedMetadata.organizationId = orgData.id;
        
        // Get organization details
        const { data: orgDetails } = await supabase
          .from("organizations")
          .select("name, type")
          .eq("id", orgData.id)
          .single();
          
        if (orgDetails) {
          updatedMetadata.organizationName = orgDetails.name;
          updatedMetadata.organizationType = orgDetails.type;
        }
      }
    }
    
    console.log("Setting user metadata:", updatedMetadata);
    
    // Update the user metadata using the admin client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      session.user.id,
      { user_metadata: updatedMetadata }
    );

    if (error) {
      console.error("Error updating user metadata:", error);
      return NextResponse.json(
        { success: false, message: "Failed to set admin role", error: error.message },
        { status: 500 }
      );
    }

    // Also update organization_members table to ensure membership
    if (updatedMetadata.organizationId) {
      // Check if membership already exists
      const { data: existingMember } = await supabase
        .from("user_organizations")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("organization_id", updatedMetadata.organizationId)
        .maybeSingle();
        
      if (!existingMember) {
        // Create membership with admin role
        await supabase
          .from("user_organizations")
          .insert({
            user_id: session.user.id,
            organization_id: updatedMetadata.organizationId,
            role_id: "admin"// Assuming 1 = admin role
          });
      } else {
    // Update existing membership to admin role
    await supabase
      .from("user_organizations")
      .update({ role_id: "admin" })
      .eq("user_id", session.user.id)
      .eq("organization_id", updatedMetadata.organizationId);
  }
}
    

    return NextResponse.json({
      success: true,
      message: "Admin role set successfully",
      metadata: updatedMetadata
    });
  } catch (error) {
    console.error("Set admin role error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}