import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const API_URL = process.env.DOCUMENT_PROCESSOR_API_URL || "http://localhost:5001";

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

    // Parse request body
    const body = await request.json();
    const { documentId, question } = body;

    if (!documentId || !question) {
      return NextResponse.json(
        { success: false, message: "Document ID and question are required" },
        { status: 400 }
      );
    }

    // Get the document details from database
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("organization_id, metadata")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { success: false, message: "Document not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this organization
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("organization_id", document.organization_id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { success: false, message: "You don't have access to this document" },
        { status: 403 }
      );
    }

    // Get batch ID from metadata
    const batchId = document.metadata?.batch_id;
    if (!batchId) {
      return NextResponse.json(
        { success: false, message: "Document has not been processed yet" },
        { status: 400 }
      );
    }

    // Send question to document processor service
    const queryResponse = await fetch(`${API_URL}/ask-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        batch_id: batchId,
        question
      })
    });

    if (!queryResponse.ok) {
      const errorData = await queryResponse.json();
      return NextResponse.json(
        { success: false, message: `Failed to query document: ${errorData.error}` },
        { status: 500 }
      );
    }

    // Return the response from the document processor
    const responseData = await queryResponse.json();

    // Log the query in the database
    const { error: logError } = await supabase
      .from("document_queries")
      .insert([
        {
          document_id: documentId,
          user_id: session.user.id,
          question,
          answer: responseData.answer,
          created_at: new Date().toISOString()
        }
      ]);

    if (logError) {
      console.error("Failed to log document query:", logError);
    }

    return NextResponse.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error("Document query error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}