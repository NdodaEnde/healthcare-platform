"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { File, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { formatDate, formatBytes } from "@/lib/utils";

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

export function DocumentList() {
  const { user, tenant } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["documents", tenant?.organizationId],
    queryFn: async () => {
      if (!tenant) return { documents: [] };

      const response = await fetch(`/api/documents?organizationId=${tenant.organizationId}`, {
        // No need to manually add authorization headers
      });

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      return response.json();
    },
    enabled: !!tenant && !!user,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading documents...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-4 text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load documents"}
        </p>
      </div>
    );
  }

  const documents = data?.documents || [];

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <File className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No documents found</h3>
        <p className="text-muted-foreground mt-2 mb-6">
          Upload your first document to start processing medical certificates.
        </p>
        <Button asChild>
          <Link href="/documents/upload">Upload Documents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((doc: Document) => (
        <Card key={doc.id} className="overflow-hidden">
          <CardHeader>
            <CardTitle className="truncate text-base font-medium">
              {doc.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span>{formatBytes(doc.file_size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded:</span>
              <span>{formatDate(doc.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span 
                className={
                  doc.status === "completed" 
                    ? "text-green-600 dark:text-green-400" 
                    : doc.status === "failed" 
                    ? "text-destructive" 
                    : "text-amber-600 dark:text-amber-400"
                }
              >
                {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
              </span>
            </div>
            {doc.has_certificates && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Certificates:</span>
                <span>{doc.certificate_count}</span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/documents/${doc.id}`}>
                View Document <ArrowUpRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}