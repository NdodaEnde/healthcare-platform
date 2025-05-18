"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus, AlertCircle, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { MembersTable } from "./members-table";
import { InvitationsTable } from "./invitations-table";
import { InviteUserDialog } from "./invite-user-dialog";

export default function TeamPage() {
  const { user, tenant } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const router = useRouter();
  
  // Known roles for simulation mode
  const [roles] = useState([
    { id: "admin", name: "Administrator" },
    { id: "manager", name: "Manager" },
    { id: "doctor", name: "Doctor" },
    { id: "nurse", name: "Nurse" },
    { id: "technician", name: "Technician" },
    { id: "receptionist", name: "Receptionist" }
  ]);

  // Fetch organization members
  const {
    data: membersData,
    isLoading: isMembersLoading,
    isError: isMembersError,
    refetch: refetchMembers
  } = useQuery({
    queryKey: ["members", tenant?.organizationId],
    queryFn: async () => {
      if (!tenant?.organizationId) return { members: [] };

      const response = await fetch(`/api/team/members?organizationId=${tenant.organizationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch organization members");
      }
      return response.json();
    },
    enabled: !!tenant?.organizationId && !!user
  });

  // Fetch pending invitations
  const {
    data: invitationsData,
    isLoading: isInvitationsLoading,
    isError: isInvitationsError,
    refetch: refetchInvitations
  } = useQuery({
    queryKey: ["invitations", tenant?.organizationId],
    queryFn: async () => {
      if (!tenant?.organizationId) return { invitations: [] };

      const response = await fetch(`/api/invitations?organizationId=${tenant.organizationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }
      return response.json();
    },
    enabled: !!tenant?.organizationId && !!user
  });

  const members = membersData?.members || [];
  const invitations = invitationsData?.invitations || [];
  const isAdmin = tenant?.role === "admin" || tenant?.role === "owner";

  // Mock data for simulation mode
  const [simulatedInvitations, setSimulatedInvitations] = useState<any[]>([
    {
      id: "mock-1",
      email: "doctor@example.com",
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days from now
      accepted: false,
      role_id: "doctor",
      system_roles: {
        id: "doctor",
        name: "Doctor"
      }
    },
    {
      id: "mock-2",
      email: "nurse@example.com",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      accepted: false,
      role_id: "nurse",
      system_roles: {
        id: "nurse",
        name: "Nurse"
      }
    }
  ]);

  // Handle new invitation
  const handleInviteSent = (email?: string, roleId?: string) => {
    refetchInvitations();
    
    // If we have email and role data, add to simulated invitations
    if (email && roleId) {
      const newInvitation = {
        id: `mock-${Date.now()}`,
        email,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        accepted: false,
        role_id: roleId,
        system_roles: {
          id: roleId,
          name: roles.find(r => r.id === roleId)?.name || "Team Member"
        }
      };
      
      setSimulatedInvitations(prev => [newInvitation, ...prev]);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    // Implement resending the invitation
    console.log("Resend invitation:", invitationId);
    
    // For simulated mode, just refresh the expiration date
    setSimulatedInvitations(prev => 
      prev.map(inv => 
        inv.id === invitationId 
          ? {...inv, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}
          : inv
      )
    );
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    // Implement revoking the invitation
    console.log("Revoke invitation:", invitationId);
    
    // For simulated mode, remove the invitation
    setSimulatedInvitations(prev => 
      prev.filter(inv => inv.id !== invitationId)
    );
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/dashboard')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">
            Manage your organization members and invitations
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        )}
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>
                Users who have access to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMembersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isMembersError ? (
                <div className="flex justify-center py-8 text-destructive">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  <span>Failed to load members</span>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No members found</p>
                </div>
              ) : (
                <MembersTable 
                  members={members} 
                  currentUserId={user?.id || ''} 
                  isAdmin={isAdmin} 
                  refetchMembers={refetchMembers}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invitations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Users who have been invited but have not yet joined
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isInvitationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : isInvitationsError ? (
                <div className="flex justify-center py-8 text-destructive">
                  <AlertCircle className="h-6 w-6 mr-2" />
                  <span>Failed to load invitations</span>
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pending invitations</p>
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsInviteDialogOpen(true)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Invite Someone
                    </Button>
                  )}
                </div>
              ) : (
                <InvitationsTable 
                  invitations={invitations} 
                  isAdmin={isAdmin} 
                  onResend={handleResendInvitation}
                  onRevoke={handleRevokeInvitation}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <InviteUserDialog 
        open={isInviteDialogOpen} 
        onOpenChange={setIsInviteDialogOpen}
        organizationId={tenant?.organizationId || ''}
        onInviteSent={(email, roleId) => handleInviteSent(email, roleId)}
      />
    </div>
  );
}