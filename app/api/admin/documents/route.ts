import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Create a Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    // Log the environment variables (sanitized)
    console.log("Admin Documents: Environment check", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    });

    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Verify authentication using regular client
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is an administrator from user metadata
    const { data: userData } = await supabase.auth.getUser();
    
    // More comprehensive admin check
    let isAdmin = 
      userData?.user?.user_metadata?.role === 'admin' || 
      userData?.user?.user_metadata?.role_id === 'admin';

    console.log("Admin document list - User role check:", {
      userId: session.user.id,
      role: userData?.user?.user_metadata?.role,
      role_id: userData?.user?.user_metadata?.role_id,
      metadata: userData?.user?.user_metadata,
      isAdmin,
      organizationId
    });

    // Also check user_organizations table as fallback
    if (!isAdmin) {
      const { data: memberData } = await supabase
        .from("user_organizations")
        .select("role_id")
        .eq("user_id", session.user.id)
        .eq("organization_id", organizationId)
        .single();
        
      // Set admin status if role_id is admin in user_organizations
      const isOrgAdmin = memberData?.role_id === 'admin';
      console.log("Organization membership check:", { 
        memberData, 
        isOrgAdmin 
      });
      
      if (isOrgAdmin) {
        // If user is an admin in the organization but not in metadata,
        // update the metadata to match
        await supabase.auth.updateUser({
          data: { role: 'admin' }
        });
      }
      
      // Use either check for admin access
      isAdmin = isAdmin || isOrgAdmin;
    }

    // Only allow admins to use this endpoint
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    // Try a simple query first to test the admin client connection
    console.log("Testing admin client connection...");
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from("documents")
        .select("id")
        .limit(1);
        
      if (testError) {
        console.error("Admin client test query failed:", testError);
        return NextResponse.json(
          { success: false, message: "Admin service role connection failed", error: testError.message },
          { status: 500 }
        );
      }
      
      console.log("Admin client test query successful");
    } catch (testError) {
      console.error("Error testing admin client connection:", testError);
      return NextResponse.json(
        { success: false, message: "Admin service role error", error: testError instanceof Error ? testError.message : String(testError) },
        { status: 500 }
      );
    }

    // Use admin client to query documents without RLS restrictions
    console.log("Querying documents with admin client...");
    try {
      const { data: documents, error } = await supabaseAdmin
        .from("documents")
        .select(`
          *,
          fitness_certificates!fitness_certificates_document_id_fkey(count)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Admin document list error:", error);
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

      console.log("Successfully fetched documents:", documents.length);
      
      return NextResponse.json({
        success: true,
        documents: processedDocuments
      });
    } catch (queryError) {
      console.error("Error in admin documents query:", queryError);
      return NextResponse.json(
        { success: false, message: "Error querying documents", error: queryError instanceof Error ? queryError.message : String(queryError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Admin document list error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}