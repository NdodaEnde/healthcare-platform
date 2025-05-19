"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Loader2, RefreshCw, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PdfViewer } from "@/components/pdf-viewer";
import { DocumentQA } from "@/components/document-qa";
import { useAuth } from "@/components/providers/auth-provider";
import { formatDate, formatBytes, isPdf } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  certificates: Certificate[];
}

interface Certificate {
  id: string;
  document_id: string;
  type: string;
  metadata: Record<string, any>;
  extracted_at: string;
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, tenant } = useAuth();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [highlights, setHighlights] = useState<any[]>([]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      if (!tenant) return null;

      const response = await fetch(`/api/documents/${id}`, {
        // No need for manual authorization headers
      });

      if (!response.ok) {
        throw new Error("Failed to fetch document");
      }

      return response.json();
    },
    enabled: !!id && !!user && !!tenant,
  });

  useEffect(() => {
    // If the document is still processing, poll every 5 seconds
    let interval: NodeJS.Timeout;
    
    if (data?.document?.status === "processing" || data?.document?.status === "pending") {
      interval = setInterval(() => {
        refetch();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [data, refetch]);

  function handlePageRendered(pageNumber: number, totalPages: number) {
    setCurrentPage(pageNumber);
    setTotalPages(totalPages);
  }
  
  function handleAnswerReceived(answer: any) {
    if (answer.best_chunks) {
      // Convert evidence chunks to highlights
      const newHighlights = answer.best_chunks.map((chunk: any) => ({
        page: chunk.bbox.page,
        left: chunk.bbox.left,
        top: chunk.bbox.top,
        right: chunk.bbox.right,
        bottom: chunk.bbox.bottom,
        color: "#FFDC00" // Yellow highlight
      }));
      
      setHighlights(newHighlights);
    }
  }

  function handleDownload() {
    if (data?.document?.file_url) {
      window.open(data.document.file_url, "_blank");
    }
  }

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (isError || !data?.document) {
    return (
      <div className="container py-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <div className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="mt-4 text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load document"}
          </p>
        </div>
      </div>
    );
  }

  const document = data.document;
  const hasCertificates = document.certificates && document.certificates.length > 0;

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <h1 className="text-2xl font-bold truncate mb-4">{document.name}</h1>
            
            {/* PDF Viewer */}
            {isPdf(document.name) ? (
              <div className="h-[700px]">
                <PdfViewer
                  fileUrl={document.file_url}
                  highlights={highlights}
                  onPageRendered={handlePageRendered}
                />
              </div>
            ) : (
              <div className="border rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground">
                <p className="text-lg">
                  Preview not available for this file type.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="mt-4"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            )}
          </div>

          {/* Document Info Sidebar */}
          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-medium mb-3">Document Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">File Size:</span>
                  <span>{formatBytes(document.file_size)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uploaded:</span>
                  <span>{formatDate(document.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{document.file_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span 
                    className={
                      document.status === "completed" 
                        ? "text-green-600 dark:text-green-400" 
                        : document.status === "failed" 
                        ? "text-destructive" 
                        : "text-amber-600 dark:text-amber-400"
                    }
                  >
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                    {(document.status === "processing" || document.status === "pending") && (
                      <Loader2 className="inline-block h-3 w-3 ml-2 animate-spin" />
                    )}
                  </span>
                </div>
                {document.processed_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processed:</span>
                    <span>{formatDate(document.processed_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Q&A Section */}
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-medium mb-3">Document Q&A</h2>
              {document.status === "completed" ? (
                <DocumentQA 
                  documentId={document.id} 
                  onAnswerReceived={handleAnswerReceived}
                />
              ) : document.status === "failed" ? (
                <p className="text-sm text-destructive">
                  Processing failed. Unable to ask questions about this document.
                </p>
              ) : (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Document is still processing. Q&A will be available once processing is complete.
                </div>
              )}
            </div>
            
            {/* Certificates Section */}
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-medium mb-3">Certificates</h2>
              {document.status === "completed" ? (
                hasCertificates ? (
                  <div className="space-y-2">
                    {document.certificates.map((cert) => (
                      <div key={cert.id} className="p-3 border rounded-md">
                        <div className="font-medium">{cert.type}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Extracted: {formatDate(cert.extracted_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No certificates were found in this document.
                  </p>
                )
              ) : document.status === "failed" ? (
                <p className="text-sm text-destructive">
                  Processing failed. Unable to extract certificates.
                </p>
              ) : (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Processing document...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}