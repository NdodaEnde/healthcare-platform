"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Settings, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { getInitials } from "@/lib/utils";

export function UserNav() {
  const { user, tenants, tenant, switchTenant, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const userEmail = user.email || "";
  const orgName = tenant?.organizationName || "No Organization";
  const userInitials = getInitials(userEmail.split("@")[0]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <span className="text-xs font-medium">{userInitials}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userEmail}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {orgName}
            </p>
          </div>
        </DropdownMenuLabel>
        {tenants && tenants.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center">
                <span className="mr-2">Organizations</span>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuLabel>
              {tenants.map((org) => (
                <DropdownMenuItem
                  key={org.organizationId}
                  className={org.organizationId === tenant?.organizationId ? "bg-muted" : ""}
                  onClick={() => switchTenant(org.organizationId)}
                >
                  <span>{org.organizationName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {org.roleName}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push("/settings/profile")}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}