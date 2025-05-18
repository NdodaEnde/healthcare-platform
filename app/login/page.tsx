"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signIn, isLoading } = useAuth();
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
  
  // Check for query params on page load
  useEffect(() => {
    // Get the query parameters from the URL
    const params = new URLSearchParams(window.location.search);
    const registered = params.get('registered');
    const emailParam = params.get('email');
    const messageParam = params.get('message');
    
    if (registered === 'true') {
      console.log("Login page: Detected successful registration");
      
      // Use custom message if provided, otherwise use default
      if (messageParam) {
        setSuccessMessage(decodeURIComponent(messageParam));
      } else {
        setSuccessMessage("Account created successfully! Please sign in with your credentials.");
      }
      
      // If email was passed, pre-fill it
      if (emailParam) {
        setEmail(emailParam);
        console.log("Login page: Pre-filled email from params:", emailParam);
      }
      
      // Clean up the URL by removing the query parameters, but do it after a short delay
      // to ensure the parameters are fully processed
      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }, 500);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null); // Clear any success message when submitting
    setLoading(true);
  
    try {
      console.log("Login page: Attempting to sign in with email:", email);
      
      // Call the signIn function from your auth provider
      const success = await signIn(email, password);
      
      console.log("Login page: Sign-in result:", success);
      
      if (success) {
        console.log("Login page: Sign-in successful, redirecting to dashboard...");
        
        // Add a delay before redirecting to ensure session is properly established
        // This helps prevent login loops by giving the auth state time to fully update
        console.log("Login page: Adding delay before redirect to allow session to establish");
        setTimeout(() => {
          // Use replace instead of href to prevent back-button issues
          window.location.replace("/dashboard");
          
          // As a backup, set another timeout
          setTimeout(() => {
            console.log("Login page: Backup redirect triggered");
            window.location.href = "/dashboard";
          }, 2000);
        }, 1000);
      } else {
        // Handle unsuccessful login but no thrown error
        console.warn("Login page: Sign-in was unsuccessful");
        setError("Login failed. Please check your credentials and try again.");
        setLoading(false);
      }
      
    } catch (err) {
      console.error("Login page: Sign-in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to sign in. Please check your credentials."
      );
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
              <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
              <CardDescription>
                Enter your email and password to access your account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {successMessage && (
                <div className="p-3 bg-green-100 text-green-800 rounded-md flex items-start space-x-2">
                  <div className="shrink-0 h-5 w-5 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p>{successMessage}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Clear success message when user starts typing
                    if (successMessage) setSuccessMessage(null);
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // Clear success message when user starts typing
                    if (successMessage) setSuccessMessage(null);
                  }}
                  required
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
              {successMessage && (
                <div className="flex items-center gap-2 rounded-md bg-green-100 p-3 text-sm text-green-800">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <p>{successMessage}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:underline"
                >
                  Sign up
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