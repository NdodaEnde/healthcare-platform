'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createClientComponentClient();

  // Fetch the current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
    };
    
    getUser();
  }, [supabase]);

  // Validate the invitation token
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/invitations/validate?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || 'Invalid or expired invitation');
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
        setLoading(false);
      } catch (err) {
        console.error('Error validating invitation:', err);
        setError('Failed to validate invitation');
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token || !user) return;
    
    setAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to accept invitation');
        setAccepting(false);
        return;
      }

      // Redirect to the organization dashboard
      router.push(`/dashboard?org=${data.organizationId}`);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('An unexpected error occurred');
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Store the invitation token in localStorage so we can retrieve it after sign-in
    if (token) {
      localStorage.setItem('pendingInvitationToken', token);
    }
    router.push(`/auth/signin?returnUrl=${encodeURIComponent(`/invitations/accept?token=${token}`)}`);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Invitation</CardTitle>
            <CardDescription>Validating your invitation...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>There was a problem with your invitation</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show sign in prompt if user is not logged in
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>
              You need to sign in to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitation && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  You've been invited to join <span className="font-semibold">{invitation.organization_name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  The invitation was sent to <span className="font-semibold">{invitation.email}</span>
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSignIn} className="w-full">
              Sign In or Create Account
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show email mismatch error if the user's email doesn't match the invitation email
  if (invitation && user.email !== invitation.email) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-[450px]">
          <CardHeader>
            <CardTitle>Email Mismatch</CardTitle>
            <CardDescription>The invitation was sent to a different email address</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Email Mismatch</AlertTitle>
              <AlertDescription>
                This invitation was sent to <span className="font-semibold">{invitation.email}</span>, but you're signed in as <span className="font-semibold">{user.email}</span>.
                Please sign in with the correct email address.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button onClick={() => supabase.auth.signOut().then(() => router.refresh())} variant="outline" className="w-full">
              Sign Out
            </Button>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show the accept invitation UI
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitation && (
            <div className="space-y-2">
              <p className="text-sm">
                You've been invited to join <span className="font-semibold">{invitation.organization_name}</span> as a <span className="font-semibold">{invitation.role_name}</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                Invited by: {invitation.invited_by_name || 'A team member'}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push('/dashboard')} disabled={accepting}>
            Decline
          </Button>
          <Button onClick={handleAcceptInvitation} disabled={accepting}>
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}