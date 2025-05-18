"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Upload, Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dropzone } from "@/components/ui/dropzone";
import { useAuth } from "@/components/providers/auth-provider";

interface UploadResponse {
  success: boolean;
  documentIds: string[];
  message?: string;
}

export function DocumentUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user, tenant } = useAuth();
  const router = useRouter();

  const uploadMutation = useMutation<UploadResponse, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        // No need to manually add authorization headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.documentIds.length > 0) {
        // Redirect to the first document detail page
        router.push(`/documents/${data.documentIds[0]}`);
      } else {
        setError(data.message || "Upload was successful but no documents were processed.");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleUpload = () => {
    if (!files.length) {
      setError("Please select at least one file to upload.");
      return;
    }

    if (!tenant) {
      setError("No organization selected. Please select an organization before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("organizationId", tenant.organizationId);
    
    files.forEach((file) => {
      formData.append("files", file);
    });

    setError(null);
    uploadMutation.mutate(formData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Upload Medical Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <Dropzone
          value={files}
          onChange={setFiles}
          disabled={uploadMutation.isPending}
          maxFiles={10}
          maxSize={20 * 1024 * 1024} // 20MB
        />
        {error && (
          <div className="flex items-center gap-2 text-destructive mt-4 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/documents")}
          disabled={uploadMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <>
              <Upload className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : uploadMutation.isSuccess ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Uploaded
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Documents
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}