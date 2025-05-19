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

    // Verify authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    /// Check if user is an administrator from user metadata
const { data: userData } = await supabase.auth.getUser();
const isAdmin = 
  userData?.user?.user_metadata?.role === 'admin' || 
  userData?.user?.user_metadata?.role_id === 'admin';
console.log("User role check:", {
  userId: session.user.id,
  role: userData?.user?.user_metadata?.role,
  isAdmin
});

// If not admin, verify user has access to this organization
if (!isAdmin) {
  // CHANGE THIS: Update table name and column
  const { data: memberData, error: memberError } = await supabase
    .from("user_organizations")  // CHANGED from "organization_members"
    .select("role_id")           // CHANGED from "role"
    .eq("user_id", session.user.id)
    .eq("organization_id", organizationId)
    .single();
    
  // ADD THIS: More detailed logging about the membership check
  console.log("Document API: Membership check result", {
    userId: session.user.id,
    organizationId,
    hasMembership: !!memberData,
    error: memberError?.message,
    memberData
  });
    
  if (memberError || !memberData) {
    return NextResponse.json(
      { success: false, message: "You don't have access to this organization" },
      { status: 403 }
    );
  }
}

// ADD THIS: Log when permission check succeeds
console.log("Document API: Permission check passed", {
  userId: session.user.id,
  isAdmin,
  organizationId,
  accessGranted: true
});

   // Query documents with certificate counts
const { data: documents, error } = await supabase
  .from("documents")
  .select(`
    *,
    fitness_certificates!fitness_certificates_document_id_fkey(count)
  `)
  .eq("organization_id", organizationId)
  .order("created_at", { ascending: false });

if (error) {
  return NextResponse.json(
    { success: false, message: error.message },
    { status: 500 }
  );
}

// Process documents to add certificate information
const processedDocuments = documents.map((doc) => {
  const certificateCount = doc["fitness_certificates!fitness_certificates_document_id_fkey"]?.[0]?.count || 0;
  return {
    ...doc,
    has_certificates: certificateCount > 0,
    certificate_count: certificateCount,
    // Remove the certificates array
    "fitness_certificates!fitness_certificates_document_id_fkey": undefined
  };
});

    return NextResponse.json({
      success: true,
      documents: processedDocuments
    });
  } catch (error) {
    console.error("Document list error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}