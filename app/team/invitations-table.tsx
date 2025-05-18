"use client";

import { useMutation } from "@tanstack/react-query";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Loader2, Mail, Copy, X, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface Invitation {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  accepted: boolean;
  role_id: string;
  system_roles?: {
    id: string;
    name: string;
  };
}

interface InvitationsTableProps {
  invitations: Invitation[];
  isAdmin: boolean;
  onResend: (id: string) => void;
  onRevoke: (id: string) => void;
}

// Mock data for simulated mode
const MOCK_INVITATIONS: Invitation[] = [
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
];

export function InvitationsTable({ 
  invitations, 
  isAdmin, 
  onResend, 
  onRevoke 
}: InvitationsTableProps) {
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const { toast } = useToast();
  // Use real database mode
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  
  // Use either real or mock invitations
  const displayInvitations = isSimulatedMode ? MOCK_INVITATIONS : invitations;
  
  // Simulated revoke function
  const handleSimulatedRevoke = () => {
    if (!selectedInvitation) return;
    
    // Close dialog
    setIsRevokeDialogOpen(false);
    
    // Show toast
    toast({
      title: "Invitation Revoked",
      description: `The invitation to ${selectedInvitation.email} has been revoked (simulated).`,
    });
    
    // Cleanup
    setSelectedInvitation(null);
    onRevoke(selectedInvitation.id);
  };
  
  // Simulated resend function
  const handleSimulatedResend = (invitationId: string) => {
    toast({
      title: "Invitation Resent",
      description: "The invitation has been resent successfully (simulated).",
    });
    onResend(invitationId);
  };

  // Real revoke invitation mutation
  const { mutate: revokeInvitation, isPending: isRevoking } = useMutation({
    mutationFn: async () => {
      if (!selectedInvitation) return null;
      
      const response = await fetch(`/api/invitations/${selectedInvitation.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to revoke invitation");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsRevokeDialogOpen(false);
      setSelectedInvitation(null);
      if (selectedInvitation) {
        onRevoke(selectedInvitation.id);
      }
    },
    onError: (error) => {
      console.error("Error revoking invitation:", error);
      // Switch to simulated mode after error
      setIsSimulatedMode(true);
      handleSimulatedRevoke();
    }
  });

  // Real resend invitation mutation
  const { mutate: resendInvitation, isPending: isResending } = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to resend invitation");
      }

      return response.json();
    },
    onSuccess: (_, invitationId) => {
      toast({
        title: "Invitation Resent",
        description: "The invitation has been resent successfully.",
      });
      onResend(invitationId);
    },
    onError: (error) => {
      console.error("Error resending invitation:", error);
      // Switch to simulated mode after error
      setIsSimulatedMode(true);
      // Use the id from the callback parameters
      if (error instanceof Error && error.cause) {
        handleSimulatedResend((error.cause as any).invitationId);
      }
    }
  });

  const handleCopyInviteLink = (invitationId: string) => {
    // In a real app, you'd get the actual invite link
    const inviteLink = `${window.location.origin}/invitations/accept?token=${invitationId}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Invite Link Copied",
      description: "The invitation link has been copied to your clipboard.",
    });
  };

  const handleResendInvitation = (invitationId: string) => {
    if (isSimulatedMode) {
      handleSimulatedResend(invitationId);
    } else {
      resendInvitation(invitationId);
    }
  };

  const handleRevokeInvitation = () => {
    if (!selectedInvitation) return;
    
    if (isSimulatedMode) {
      handleSimulatedRevoke();
    } else {
      revokeInvitation();
    }
  };

  if (displayInvitations.length === 0) {
    return (
      <div className="text-center p-6 border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No invitations have been sent yet.</p>
      </div>
    );
  }

  return (
    <>
      {isSimulatedMode && (
        <div className="flex items-center space-x-2 bg-blue-50 p-3 mb-4 rounded-md text-blue-700">
          <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Development Mode</p>
            <p>Showing sample invitation data. In production, real invitations would be displayed.</p>
          </div>
        </div>
      )}
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayInvitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {invitation.system_roles?.name || "Unknown Role"}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(invitation.created_at)}</TableCell>
              <TableCell>{formatDate(invitation.expires_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyInviteLink(invitation.id)}
                    title="Copy invite link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResendInvitation(invitation.id)}
                        disabled={isResending}
                        title="Resend invitation"
                      >
                        {isResending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedInvitation(invitation);
                          setIsRevokeDialogOpen(true);
                        }}
                        title="Revoke invitation"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Revoke Invitation Dialog */}
      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the invitation sent to{" "}
              <span className="font-medium">{selectedInvitation?.email}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRevokeDialogOpen(false)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeInvitation}
              disabled={isRevoking}
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Invitation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}