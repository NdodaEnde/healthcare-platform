"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onInviteSent: (email?: string, roleId?: string) => void;
}

export function InviteUserDialog({ 
  open, 
  onOpenChange, 
  organizationId, 
  onInviteSent 
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [validationError, setValidationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Use real database mode
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);

  // Fetch available roles
  const { data: rolesData, isLoading: isRolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await fetch("/api/roles");
      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }
      return response.json();
    },
    enabled: open // Only fetch when dialog is open
  });

  const roles = rolesData?.roles || [];

  // Simplified mock invitation handler (for development/demo)
  const handleSimulatedInvite = () => {
    // Validate inputs
    if (!email) {
      setValidationError("Email is required");
      return;
    }

    if (!roleId) {
      setValidationError("Role is required");
      return;
    }

    // Simulate a delay (like an API call)
    setValidationError("");
    setSuccessMessage("");
    
    setTimeout(() => {
      // Show success message
      setSuccessMessage("Invitation sent successfully (simulated)!");
      
      // Clear form and notify parent
      setTimeout(() => {
        setEmail("");
        setRoleId("");
        setSuccessMessage("");
        onInviteSent(email, roleId);
        onOpenChange(false);
      }, 2000);
    }, 1000);
  };

  // Send invitation mutation (real implementation)
  const { mutate: sendInvitation, isPending } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          organizationId,
          roleId,
          // Use real database
          forceBypass: 'false'
        }),
      });

      const data = await response.json();
      
      // Log the response for debugging
      console.log("Invitation API response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to send invitation");
      }

      // Check if we're in fallback mode (database operation failed)
      if (data.fallback) {
        console.warn("Using fallback invitation tracking:", data.error);
        // Let the user know we're using fallback mode
        setIsSimulatedMode(true);
      }

      return data;
    },
    onSuccess: (data) => {
      // Use the message from the response if available
      const message = data.fallback 
        ? "Invitation sent successfully (simulated mode)"
        : "Invitation sent successfully!";
        
      setSuccessMessage(message);
      
      // Clear form and notify parent
      setTimeout(() => {
        setEmail("");
        setRoleId("");
        setSuccessMessage("");
        onInviteSent(email, roleId);
        onOpenChange(false);
      }, 2000);
    },
    onError: (error: Error) => {
      console.error("Invitation error:", error);
      
      // Check if there's more detailed error info in the cause
      if (error.cause && typeof error.cause === 'object' && 'error' in error.cause) {
        const detailedError = (error.cause as any).error;
        
        if (detailedError) {
          // Set the error message with more details
          const errorMessage = `${error.message}\n\nDetails: ${
            typeof detailedError === 'string' 
              ? detailedError 
              : (detailedError.message || JSON.stringify(detailedError))
          }`;
          
          setValidationError(errorMessage);
          return;
        }
      }
      
      // Default error handling
      const errorMessage = error.message || "An unknown error occurred";
      setValidationError(errorMessage);
      
      // If this appears to be a database error, show a helper message
      if (errorMessage.includes('database') || 
          errorMessage.includes('table') || 
          errorMessage.includes('schema')) {
        setValidationError(`${errorMessage}\n\nThe database may not be properly configured. Please apply the migrations from /supabase/migrations/combined_invitations_setup.sql`);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");
    setSuccessMessage("");

    // Validate inputs
    if (!email) {
      setValidationError("Email is required");
      return;
    }

    if (!roleId) {
      setValidationError("Role is required");
      return;
    }

    // Use simulated mode or real API
    if (isSimulatedMode) {
      handleSimulatedInvite();
    } else {
      sendInvitation();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a new user to join your organization.
          </DialogDescription>
        </DialogHeader>

        {isSimulatedMode && (
          <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-md text-blue-700">
            <Info className="h-5 w-5 text-blue-500" />
            <div className="text-sm">
              <p className="font-semibold">Development Mode</p>
              <p>Invitations are simulated. In production, emails would be sent.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            {isRolesLoading ? (
              <div className="flex items-center space-x-2 h-10 px-3 py-2 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading roles...</span>
              </div>
            ) : (
              <Select value={roleId} onValueChange={setRoleId} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: { id: string, name: string }) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {validationError && (
            <div className="flex items-center space-x-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{validationError}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center space-x-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>{successMessage}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isRolesLoading}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}