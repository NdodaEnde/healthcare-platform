"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/components/providers/auth-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're certain the user is not logged in
    if (!isLoading && !user) {
      console.log("Dashboard layout: No authenticated user, redirecting to login");
      
      // Use a direct navigation for more reliable redirect
      window.location.href = "/login";
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 font-bold text-xl"
            >
              Surgiscan
            </Link>
          </div>
          <MainNav />
          <div className="ml-auto flex items-center space-x-4">
            <Button
              asChild
              variant="default"
              size="sm"
              className="hidden sm:flex"
            >
              <Link href="/documents/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Link>
            </Button>
            <UserNav />
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t py-4">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 Surgiscan. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}