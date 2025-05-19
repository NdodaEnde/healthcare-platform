import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
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

    // Query tables separately to avoid join issues
    // 1. Get available tables
    const { data: tables } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .in('schemaname', ['public', 'auth']);
    
    // 2. Get raw memberships
    const { data: memberships, error: membershipError } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", session.user.id);

    // 3. Get organizations separately
    const { data: organizations } = await supabase
      .from("organizations")
      .select("*");
      
    if (membershipError) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch memberships", error: membershipError.message },
        { status: 500 }
      );
    }

    // Get user's metadata
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        metadata: user?.user_metadata
      },
      availableTables: tables,
      organizations,
      memberships,
      tenantContext: {
        organizationId: user?.user_metadata?.organizationId,
        organizationName: user?.user_metadata?.organizationName,
        organizationType: user?.user_metadata?.organizationType,
        role: user?.user_metadata?.role
      }
    });
  } catch (error) {
    console.error("Debug memberships error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}