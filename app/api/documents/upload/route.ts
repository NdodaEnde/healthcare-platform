import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

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

    // Get organization ID from form data
    const formData = await request.formData();
    const organizationId = formData.get("organizationId") as string;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "Organization ID is required" },
        { status: 400 }
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

    // Handle file uploads
    const files = formData.getAll("files") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: "No files were uploaded" },
        { status: 400 }
      );
    }

    const documentIds: string[] = [];
    const uploadPromises = files.map(async (file) => {
      const documentId = uuidv4();
      const fileExtension = file.name.split(".").pop();
      const filename = `${documentId}.${fileExtension}`;
      const path = `organizations/${organizationId}/documents/${filename}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file);

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL for the file
      const { data: urlData } = await supabase.storage
        .from("documents")
        .getPublicUrl(path);

      // Create metadata record in database
      const { error: dbError } = await supabase
        .from("documents")
        .insert([
          {
            id: documentId,
            organization_id: organizationId,
            name: file.name,
            file_path: path,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            status: "pending",
            uploaded_by: session.user.id
          }
        ]);

      if (dbError) {
        throw new Error(`Failed to create document record: ${dbError.message}`);
      }

      // Download the file for processing
      const fileResponse = await fetch(urlData.publicUrl);
      const fileBlob = await fileResponse.blob();
      
      // Create a FormData object to send the file to the document processor
      const processingFormData = new FormData();
      processingFormData.append('files', fileBlob, file.name);
      
      // Send to our document processing microservice
      const processingResponse = await fetch(`${API_URL}/process-documents`, {
        method: "POST",
        body: processingFormData
      });

      if (!processingResponse.ok) {
        const errorData = await processingResponse.json();
        throw new Error(`Failed to queue document for processing: ${errorData.message}`);
      }
      
      // Store the batch ID in our database
      const processingData = await processingResponse.json();
      const { data: updateData, error: updateError } = await supabase
        .from("documents")
        .update({
          status: "processing",
          metadata: {
            batch_id: processingData.batch_id,
            processing_time: processingData.processing_time_seconds
          }
        })
        .eq("id", documentId);
        
      if (updateError) {
        console.error("Failed to update document with batch ID:", updateError);
      }

      documentIds.push(documentId);
    });

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${documentIds.length} document(s)`,
      documentIds
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}