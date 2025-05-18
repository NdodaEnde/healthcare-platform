import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
  description: "Manage your medical document processing",
};

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">{children}</div>
    </div>
  );
}