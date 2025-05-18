"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2, CheckCircle, AlertCircle, LogIn, UserPlus } from "lucide-react";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, refreshSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitationDetails, setInvitationDetails] = useState<{
    email: string;
    organizationName: string;
    roleName: string;
    expired: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch the invitation details
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!token) {
        setError("Invalid invitation link");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/invitations/validate?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Invalid invitation");
          setLoading(false);
          return;
        }

        // Extract invitation data from the response, using the invitation property
        const invitation = data.invitation;
        if (!invitation) {
          setError("Invalid invitation data");
          return;
        }
        
        setInvitationDetails({
          email: invitation.email,
          organizationName: invitation.organization_name,
          roleName: invitation.role_name,
          expired: false // This is checked separately in the API
        });
      } catch (error) {
        setError("Failed to fetch invitation details");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [token]);

  // Accept invitation mutation
  const { mutate: acceptInvitation, isPending: isAccepting } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to accept invitation");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      setSuccess(true);
      // Refresh the session to update the user's organizations
      await refreshSession();
      // Add a longer delay before redirecting
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000); // Increased from 2000 to 3000 ms
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Handle accept invitation
  const handleAcceptInvitation = () => {
    acceptInvitation();
  };

  // Redirect to login if not authenticated
  const handleLoginRedirect = () => {
    router.push(`/login?returnUrl=${encodeURIComponent(`/invitations/accept?token=${token}`)}`);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Processing Invitation</CardTitle>
            <CardDescription>Please wait while we validate your invitation.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (error || !invitationDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive flex items-center justify-center">
              <AlertCircle className="h-6 w-6 mr-2" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>{error || "The invitation link is invalid or has expired."}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-4">
            <Button onClick={() => router.push("/")}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render expired state
  if (invitationDetails.expired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive flex items-center justify-center">
              <AlertCircle className="h-6 w-6 mr-2" />
              Invitation Expired
            </CardTitle>
            <CardDescription>
              This invitation has expired. Please contact the organization admin for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-4">
            <Button onClick={() => router.push("/")}>Return to Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render success state
  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-600 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 mr-2" />
              Invitation Accepted
            </CardTitle>
            <CardDescription>
              You have successfully joined {invitationDetails.organizationName}.
              Redirecting you to the dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render invitation details and accept button (user not authenticated)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join Organization</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join {invitationDetails.organizationName} as a {invitationDetails.roleName ? invitationDetails.roleName.toLowerCase() : 'member'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-6">
              Please log in to accept this invitation or create a new account.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleLoginRedirect}>
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push(`/invitations/register?token=${token}`)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render email mismatch
  if (user.email !== invitationDetails.email) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive flex items-center justify-center">
              <AlertCircle className="h-6 w-6 mr-2" />
              Email Mismatch
            </CardTitle>
            <CardDescription>
              This invitation was sent to {invitationDetails.email}, but you are logged in as {user.email}.
              Please log in with the correct account.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              Return to Home
            </Button>
            <Button onClick={() => router.push("/login?action=switchAccount")}>
              Switch Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render invitation details and accept button (user authenticated)
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Organization</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join {invitationDetails.organizationName} as a {invitationDetails.roleName ? invitationDetails.roleName.toLowerCase() : 'member'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-6">
            Click the button below to accept this invitation and join the organization.
          </p>
          <Button 
            onClick={handleAcceptInvitation} 
            disabled={isAccepting}
            className="w-full"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept Invitation
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}