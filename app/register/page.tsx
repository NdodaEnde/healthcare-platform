"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import * as React from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("direct_client");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { signUp, isLoading } = useAuth(); // Use the signUp function from auth provider
  const router = useRouter();
  
  // Handle auth provider loading state
  useEffect(() => {
    // If auth provider is still loading after 2 seconds, stop showing loading state
    const timer = setTimeout(() => {
      if (pageLoading) setPageLoading(false);
    }, 2000);
    
    // When auth provider's loading state changes, update our page loading state
    if (!isLoading && pageLoading) setPageLoading(false);
    
    return () => clearTimeout(timer);
  }, [isLoading, pageLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log("Register page: Form submission started");

    // Validate passwords match
    if (password !== confirmPassword) {
      console.warn("Register page: Passwords don't match");
      setError("Passwords don't match");
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      console.warn("Register page: Password too short");
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!organizationName.trim()) {
      console.warn("Register page: Organization name missing");
      setError("Organization name is required");
      return;
    }

    if (!fullName.trim()) {
      console.warn("Register page: Full name missing");
      setError("Full name is required");
      return;
    }

    setLoading(true);
    console.log("Register page: Validation passed, proceeding with registration");

    try {
      console.log("Register page: Calling signUp function from auth provider");
      
      // Use the auth provider's signUp function
      const success = await signUp(email, password, fullName, organizationName, organizationType);
      
      if (success) {
        console.log("Register page: Registration successful, redirecting to login page...");
        
        // Ensure we redirect to login page without relying on auth provider
        // Use a direct replace for most reliable redirect
        // Pass the email to prefill it on the login page
        window.location.replace(`/login?registered=true&email=${encodeURIComponent(email)}`);
      } else {
        console.error("Register page: Registration failed");
        setError("Failed to create account. Please try again.");
      }
      
      return; // Stop execution here
      
    } catch (err) {
      console.error("Register page: Registration error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      {pageLoading ? (
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="w-full max-w-md p-4">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
              <CardDescription>
                Enter your details to create a new account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Your Organization"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationType">Organization Type</Label>
                <select
                  id="organizationType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  required
                >
                  <option value="direct_client">Direct Client</option>
                  <option value="service_provider">Service Provider</option>
                </select>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password || !confirmPassword || !organizationName || !fullName}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
      )}
    </div>
  );
}