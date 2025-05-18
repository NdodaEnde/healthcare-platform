"use client";

import { useState } from "react";
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, UserIcon } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Member {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role_id: string;
  role_name: string;
  joined_at: string;
}

interface MembersTableProps {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
  refetchMembers: () => void;
}

export function MembersTable({ 
  members, 
  currentUserId, 
  isAdmin, 
  refetchMembers 
}: MembersTableProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isChangeRoleDialogOpen, setIsChangeRoleDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [newRoleId, setNewRoleId] = useState("");

  // Change role mutation
  const { mutate: changeRole, isPending: isChangingRole } = useMutation({
    mutationFn: async () => {
      if (!selectedMember) return;
      
      const response = await fetch(`/api/team/members/${selectedMember.user_id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roleId: newRoleId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to change role");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsChangeRoleDialogOpen(false);
      setSelectedMember(null);
      refetchMembers();
    },
  });

  // Remove member mutation
  const { mutate: removeMember, isPending: isRemoving } = useMutation({
    mutationFn: async () => {
      if (!selectedMember) return;
      
      const response = await fetch(`/api/team/members/${selectedMember.user_id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove member");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsRemoveDialogOpen(false);
      setSelectedMember(null);
      refetchMembers();
    },
  });

  const handleChangeRole = () => {
    changeRole();
  };

  const handleRemoveMember = () => {
    removeMember();
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {isAdmin && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-muted w-8 h-8 rounded-full flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div>{member.full_name || member.email}</div>
                    {member.full_name && (
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    )}
                    {member.user_id === currentUserId && (
                      <Badge variant="outline" className="text-xs ml-1">You</Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{member.role_name}</Badge>
              </TableCell>
              <TableCell>{formatDate(member.joined_at)}</TableCell>
              {isAdmin && (
                <TableCell>
                  {member.user_id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedMember(member);
                            setNewRoleId(member.role_id);
                            setIsChangeRoleDialogOpen(true);
                          }}
                        >
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setSelectedMember(member);
                            setIsRemoveDialogOpen(true);
                          }}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Change Role Dialog */}
      <Dialog open={isChangeRoleDialogOpen} onOpenChange={setIsChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.full_name || selectedMember?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={newRoleId}
              onValueChange={setNewRoleId}
              disabled={isChangingRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangeRoleDialogOpen(false)}
              disabled={isChangingRole}
            >
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={isChangingRole}>
              {isChangingRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember?.full_name || selectedMember?.email} from your organization?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}