"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, FileText, Building2, ShieldCheck, Clock, Database, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

export default function HomePage() {
  const { user, isLoading, error } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="px-6 lg:px-8 h-20 flex items-center justify-between border-b backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary w-10 h-10 rounded-md flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Surgiscan</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-medium">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button className="rounded-full shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all">
              Get Started
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1">
        {error && (
          <div className="bg-destructive/10 p-4 border-l-4 border-destructive my-4 mx-6">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-destructive mr-2" />
              <p className="text-destructive">
                <strong>Configuration Error:</strong> {error}
              </p>
            </div>
            <div className="mt-2 text-sm text-destructive/80">
              <p>
                Please update your .env.local file with valid Supabase credentials:
              </p>
              <pre className="mt-2 p-2 bg-black/5 rounded overflow-x-auto">
                NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co{"\n"}
                NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
              </pre>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_50%_at_50%_50%,hsl(var(--primary)/0.1)_0%,hsl(var(--background))_100%)]" />
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-8 text-center">
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  <span className="text-primary">Surgiscan</span>: Medical Document Management
                </h1>
                <p className="max-w-[700px] text-muted-foreground text-lg md:text-xl mx-auto">
                  Extract, organize, and manage medical certifications with intelligent document processing — all in one secure platform.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Link href="/register" className="w-full">
                  <Button size="lg" className="w-full rounded-full text-base h-12 shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/login" className="w-full">
                  <Button size="lg" variant="outline" className="w-full rounded-full text-base h-12 hover:bg-muted/50 transition-all">
                    Sign In
                  </Button>
                </Link>
              </div>
              
              {/* Features Preview */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                <div className="bg-background border rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Document Processing</h3>
                  <p className="text-muted-foreground text-sm">
                    Upload medical documents and automatically extract certification information.
                  </p>
                </div>
                
                <div className="bg-background border rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Secure Storage</h3>
                  <p className="text-muted-foreground text-sm">
                    All your documents are stored securely with proper access controls.
                  </p>
                </div>
                
                <div className="bg-background border rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Multi-tenant</h3>
                  <p className="text-muted-foreground text-sm">
                    Manage documents across multiple organizations with dedicated workspaces.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Powerful Features for Healthcare Professionals
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our platform offers a comprehensive suite of tools designed specifically for medical document management.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border shadow-sm hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Intelligent Document Processing</h3>
                <p className="text-muted-foreground">
                  Advanced AI extracts and categorizes medical certifications automatically from various document formats.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border shadow-sm hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Multi-tenant Organization</h3>
                <p className="text-muted-foreground">
                  Securely manage documentation across departments and facilities with role-based access control.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border shadow-sm hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Secure and Compliant</h3>
                <p className="text-muted-foreground">
                  Built with healthcare compliance and security in mind, ensuring your data remains protected.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border shadow-sm hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Real-time Processing</h3>
                <p className="text-muted-foreground">
                  Upload documents and get results in seconds, with automatic data extraction and organization.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border shadow-sm hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Centralized Repository</h3>
                <p className="text-muted-foreground">
                  Store all medical certifications in one searchable, organized location for easy access.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 rounded-xl bg-background border shadow-sm hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Collaborative Workflows</h3>
                <p className="text-muted-foreground">
                  Enable team collaboration with shared access to documents and certification status.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-4 md:px-6">
            <div className="rounded-2xl bg-primary/10 p-8 md:p-12 lg:p-16 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/30%),transparent_70%)]" />
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Ready to transform your medical document workflow?
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-xl">
                  Join healthcare organizations that have streamlined their documentation processes and saved countless hours.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/register">
                    <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                      Start Free Trial
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button size="lg" variant="outline" className="rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link href="/features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
                <li><Link href="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
                <li><Link href="/demo" className="text-muted-foreground hover:text-foreground">Request Demo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About Us</Link></li>
                <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
                <li><Link href="/careers" className="text-muted-foreground hover:text-foreground">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link href="/documentation" className="text-muted-foreground hover:text-foreground">Documentation</Link></li>
                <li><Link href="/support" className="text-muted-foreground hover:text-foreground">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="/compliance" className="text-muted-foreground hover:text-foreground">Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary w-8 h-8 rounded-md flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Surgiscan</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Surgiscan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}