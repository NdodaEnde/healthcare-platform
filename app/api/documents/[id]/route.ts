import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { success: false, message: "Document ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get document with certificates
    const { data: document, error } = await supabase
      .from("documents")
      .select(`
        *,
        certificates(*)
      `)
      .eq("id", documentId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Document not found" },
        { status: 404 }
      );
    }

    // Check if user is an administrator from user metadata
    const { data: userData } = await supabase.auth.getUser();
    const isAdmin = userData?.user?.user_metadata?.role_id === 'admin';
    console.log("User role_id check (document detail):", {
      userId: session.user.id,
      role_id: userData?.user?.user_metadata?.role_id,
      isAdmin,
      documentId,
      organizationId: document.organization_id
    });
    
    // If not admin, verify user has access to this document's organization
    // If not admin, verify user has access to this organization
if (!isAdmin) {
  const { data: memberData, error: memberError } = await supabase
    .from("user_organizations")  // CHANGED: was "organization_members"
    .select("role_id")           // CHANGED: was "role"
    .eq("user_id", session.user.id)
    .eq("organization_id", organizationId)
    .single();
  
  if (memberError || !memberData) {
    console.log("Membership check failed:", {
      error: memberError,
      userId: session.user.id,
      organizationId
    });
    
    return NextResponse.json(
      { success: false, message: "You don't have access to this organization" },
      { status: 403 }
    );
  }
}