"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { File, Upload, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  has_certificates: boolean;
  certificate_count: number;
}

interface DashboardStats {
  total_documents: number;
  completed_documents: number;
  processing_documents: number;
  failed_documents: number;
  total_certificates: number;
  recent_documents: Document[];
}

export default function DashboardPage() {
  const { user, tenant } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", tenant?.organizationId],
    queryFn: async () => {
      if (!tenant) {
        console.log("Dashboard: No tenant available, returning empty stats");
        return { 
          success: true,
          stats: {
            total_documents: 0,
            completed_documents: 0,
            processing_documents: 0,
            failed_documents: 0,
            total_certificates: 0,
            recent_documents: []
          }
        };
      }

      console.log("Dashboard: Fetching dashboard data for organization:", tenant.organizationId);
      
      try {
        const response = await fetch(`/api/dashboard?organizationId=${tenant.organizationId}`);
        
        // Handle non-ok responses
        if (!response.ok) {
          console.error("Dashboard: Failed to fetch dashboard data:", response.status);
          // Instead of throwing, return empty stats for a better UX
          return { 
            success: true,
            stats: {
              total_documents: 0,
              completed_documents: 0,
              processing_documents: 0,
              failed_documents: 0,
              total_certificates: 0,
              recent_documents: []
            }
          };
        }
        
        const result = await response.json();
        console.log("Dashboard: Successfully fetched dashboard data");
        return result;
      } catch (error) {
        console.error("Dashboard: Error fetching dashboard data:", error);
        // Return empty data instead of failing
        return { 
          success: true,
          stats: {
            total_documents: 0,
            completed_documents: 0,
            processing_documents: 0,
            failed_documents: 0,
            total_certificates: 0,
            recent_documents: []
          }
        };
      }
    },
    // Always enable the query - it will return empty data if no tenant
    enabled: true,
    // Add retry for better reliability
    retry: 2,
    retryDelay: 1000,
  });

  const stats: DashboardStats | null = data?.stats || null;

  return (
    <div className="flex-1">
      <div className="container space-y-6 py-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to your healthcare document management dashboard
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex justify-center p-8">
            <div className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Failed to load dashboard data
            </div>
          </div>
        ) : stats ? (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Documents
                  </CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_documents || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completed_documents || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Processing
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.processing_documents || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Certificates Found
                  </CardTitle>
                  <File className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_certificates || 0}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Recent Documents</CardTitle>
                  <CardDescription>
                    Your recently processed documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recent_documents && stats.recent_documents.length > 0 ? (
                    <div className="space-y-4">
                      {stats.recent_documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              doc.status === 'completed' ? 'bg-green-500' : 
                              doc.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                            }`} />
                            <div className="truncate max-w-[200px] sm:max-w-[300px]">
                              {doc.name}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/documents/${doc.id}`}>View</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <File className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No documents yet</h3>
                      <p className="text-muted-foreground mt-2 mb-6">
                        Upload your first document to get started.
                      </p>
                      <Button asChild>
                        <Link href="/documents/upload">
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Document
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    Quick actions to help you get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Upload Documents</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload medical documents to extract certificates and other important information.
                    </p>
                    <Button asChild>
                      <Link href="/documents/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Link>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">View All Documents</h4>
                    <p className="text-sm text-muted-foreground">
                      Browse and manage all your uploaded documents.
                    </p>
                    <Button variant="outline" asChild>
                      <Link href="/documents">
                        <File className="mr-2 h-4 w-4" />
                        View Documents
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center p-8">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-medium mb-2">No organization selected</h3>
              <p className="text-muted-foreground mb-4">
                Please select an organization to view your dashboard.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}