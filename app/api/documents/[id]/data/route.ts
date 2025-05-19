import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const API_URL = process.env.DOCUMENT_PROCESSOR_API_URL || "http://localhost:5001";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const documentId = params.id;

    // Get the document details from database
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("organization_id, metadata, file_url")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { success: false, message: "Document not found" },
        { status: 404 }
      );
    }

    // Check if user is an administrator from user metadata
    const { data: userData } = await supabase.auth.getUser();
    const isAdmin = userData?.user?.user_metadata?.role_id === 'admin';
    console.log("User role_id check (document data):", {
      userId: session.user.id,
      role_id: userData?.user?.user_metadata?.role_id,
      isAdmin,
      documentId,
      organizationId: document.organization_id
    });
    
    // If not admin, verify user has access to this organization
    if (!isAdmin) {
      const { data: memberData, error: memberError } = await supabase
        .from("user_organizations")
        .select("role_id")
        .eq("user_id", session.user.id)
        .eq("organization_id", document.organization_id)
        .single();

      if (memberError || !memberData) {
        return NextResponse.json(
          { success: false, message: "You don't have access to this document" },
          { status: 403 }
        );
      }
    }

    // Get batch ID from metadata
    const batchId = document.metadata?.batch_id;
    if (!batchId) {
      return NextResponse.json(
        { success: false, message: "Document has not been processed yet" },
        { status: 400 }
      );
    }

    // Get processed data from document processor
    const dataResponse = await fetch(`${API_URL}/get-document-data/${batchId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!dataResponse.ok) {
      const errorData = await dataResponse.json();
      return NextResponse.json(
        { success: false, message: `Failed to get document data: ${errorData.error}` },
        { status: 500 }
      );
    }

    // Return the response from the document processor with the document's URL
    const responseData = await dataResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        ...responseData,
        documentUrl: document.file_url
      }
    });
  } catch (error) {
    console.error("Document data fetch error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}