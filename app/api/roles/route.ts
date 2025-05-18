import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Exact system roles from the database
const DEFAULT_ROLES = [
  { 
    id: "admin", 
    name: "Administrator", 
    permissions: ["manage:all", "manage:client_organizations"]
  },
  { 
    id: "manager", 
    name: "Manager", 
    permissions: ["view:all", "manage:client_organizations", "manage:reports"]
  },
  { 
    id: "doctor", 
    name: "Doctor", 
    permissions: ["view:patients", "view:tests", "view:certificates", "approve:certificates", "sign:certificates"]
  },
  { 
    id: "nurse", 
    name: "Nurse", 
    permissions: ["view:patients", "create:vitals", "update:vitals", "view:tests"]
  },
  { 
    id: "technician", 
    name: "Technician", 
    permissions: ["view:patients", "create:tests", "update:tests", "view:test_types"]
  },
  { 
    id: "receptionist", 
    name: "Receptionist", 
    permissions: ["view:patients", "create:patients", "update:patients", "view:tests", "view:vitals", "create:certificates", "update:certificates"]
  },
  { 
    id: "employer", 
    name: "Employer", 
    permissions: ["view:certificates"]
  },
  { 
    id: "data_entry", 
    name: "Data Entry", 
    permissions: ["create:historical_records", "view:patients", "view:certificates"]
  },
  { 
    id: "member", 
    name: "Member", 
    permissions: ["view:basic"]
  }
];

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all roles
    const { data: roles, error } = await supabase
      .from("system_roles")
      .select("id, name, permissions")
      .order("name");

    if (error) {
      console.error("Error fetching roles:", error);
      
      // Return default roles if there's an error
      return NextResponse.json({
        success: true,
        roles: DEFAULT_ROLES
      });
    }

    // If we have no roles, provide default ones
    if (!roles || roles.length === 0) {
      return NextResponse.json({
        success: true,
        roles: DEFAULT_ROLES
      });
    }

    return NextResponse.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    
    // Return default roles even in case of error
    return NextResponse.json({
      success: true,
      roles: DEFAULT_ROLES
    });
  }
}