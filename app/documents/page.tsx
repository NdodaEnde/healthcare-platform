import { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/document-list";

export const metadata: Metadata = {
  title: "Documents",
  description: "View and manage your medical documents",
};

export default function DocumentsPage() {
  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your uploaded medical documents
          </p>
        </div>
        <Button asChild>
          <Link href="/documents/upload">
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Link>
        </Button>
      </div>
      <DocumentList />
    </div>
  );
}