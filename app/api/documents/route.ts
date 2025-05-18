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

    // Verify user has access to this organization
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this organization" },
        { status: 403 }
      );
    }

    // Query documents with certificate counts
    const { data: documents, error } = await supabase
      .from("documents")
      .select(`
        *,
        certificates:certificates(count)
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
      const certificateCount = doc.certificates?.[0]?.count || 0;
      return {
        ...doc,
        has_certificates: certificateCount > 0,
        certificate_count: certificateCount,
        certificates: undefined // Remove the certificates array
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