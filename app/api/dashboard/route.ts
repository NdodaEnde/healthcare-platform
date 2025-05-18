import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    
    console.log("Dashboard API: Received request for organization ID:", organizationId);

    if (!organizationId) {
      console.log("Dashboard API: No organization ID provided");
      return NextResponse.json(
        { success: false, message: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication
    console.log("Dashboard API: Creating Supabase client to verify auth");
    const supabase = createRouteHandlerClient({ cookies });
    
    // Define session outside the try-catch block so it's accessible throughout the function
    let session;
    
    try {
      console.log("Dashboard API: Getting session");
      const { data } = await supabase.auth.getSession();
      session = data.session;
  
      if (!session) {
        console.log("Dashboard API: No session found");
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
      
      console.log("Dashboard API: Session found for user ID:", session.user.id);
    } catch (authError) {
      console.error("Dashboard API: Error getting session:", authError);
      return NextResponse.json(
        { success: false, message: "Authentication error" },
        { status: 401 }
      );
    }

    // Handle default organization ID from our default tenant
    if (organizationId === 'default') {
      // For default organization, skip permission check and return empty data
      return NextResponse.json({
        success: true,
        stats: {
          total_documents: 0,
          completed_documents: 0,
          processing_documents: 0,
          failed_documents: 0,
          total_certificates: 0,
          recent_documents: []
        }
      });
    }
    
    // Verify user has access to this organization
    const { data: memberData, error: memberError } = await supabase
      .from("user_organizations")
      .select("role_id")
      .eq("user_id", session.user.id)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !memberData) {
      console.log("Dashboard API: User doesn't have access to this organization");
      // Just return empty data instead of 403 to simplify UX
      return NextResponse.json({
        success: true,
        stats: {
          total_documents: 0,
          completed_documents: 0,
          processing_documents: 0,
          failed_documents: 0,
          total_certificates: 0,
          recent_documents: []
        }
      });
    }

    // Get document stats
    const { data: documentsData, error: documentsError } = await supabase
      .from("documents")
      .select("id, status")
      .eq("organization_id", organizationId);

    if (documentsError) {
      console.error("Error fetching documents:", documentsError);
      return NextResponse.json(
        { success: false, message: documentsError.message },
        { status: 500 }
      );
    }
    
    // Ensure we have an array of documents even if none were found
    const documents = documentsData || [];

    // Get certificate counts (if there are documents)
    let certificatesData = [];
    let certificatesError = null;
    
    if (documents && documents.length > 0) {
      const response = await supabase
        .from("certificates")
        .select("id, document_id")
        .in(
          "document_id",
          documents.map((doc) => doc.id)
        );
        
      certificatesData = response.data || [];
      certificatesError = response.error;
      
      if (certificatesError) {
        console.error("Error fetching certificates:", certificatesError);
        return NextResponse.json(
          { success: false, message: certificatesError.message },
          { status: 500 }
        );
      }
    }

    // Get recent documents with certificate info
    const { data: recentDocuments, error: recentError } = await supabase
      .from("documents")
      .select(`
        *,
        certificates:certificates(count)
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) {
      console.error("Error fetching recent documents:", recentError);
      return NextResponse.json(
        { success: false, message: recentError.message },
        { status: 500 }
      );
    }
    
    // Ensure we have an array of documents even if none were found
    const processedDocuments = recentDocuments || [];

    // Calculate stats
    const total_documents = documents.length;
    const completed_documents = documents.filter(
      (doc) => doc.status === "completed"
    ).length;
    const processing_documents = documents.filter(
      (doc) => doc.status === "processing" || doc.status === "pending"
    ).length;
    const failed_documents = documents.filter(
      (doc) => doc.status === "failed"
    ).length;
    const total_certificates = certificatesData?.length || 0;

    // Process recent documents
    const processedRecentDocuments = processedDocuments.map((doc) => {
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
      stats: {
        total_documents,
        completed_documents,
        processing_documents,
        failed_documents,
        total_certificates,
        recent_documents: processedRecentDocuments
      }
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    // Instead of failing with 500, return empty data
    return NextResponse.json({
      success: true,
      stats: {
        total_documents: 0,
        completed_documents: 0,
        processing_documents: 0,
        failed_documents: 0,
        total_certificates: 0,
        recent_documents: []
      }
    });
  }
}