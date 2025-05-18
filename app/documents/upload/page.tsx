import { Metadata } from "next";
import { DocumentUpload } from "@/components/document-upload";

export const metadata: Metadata = {
  title: "Upload Documents",
  description: "Upload medical documents for processing",
};

export default function UploadPage() {
  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Upload Documents</h1>
        <p className="text-muted-foreground mt-2">
          Upload medical documents for processing and certificate extraction
        </p>
      </div>
      <DocumentUpload />
    </div>
  );
}