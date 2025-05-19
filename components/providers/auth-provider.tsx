'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { SupabaseClient, User } from '@supabase/supabase-js';

export type TenantContext = {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  clientOrganizationId: string | null;
  clientOrganizationName: string | null;
  role: string;
  roleName: string;
  permissions: string[];
};

type AuthContextType = {
  user: User | null;
  tenant: TenantContext | null;
  tenants: TenantContext[];
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string, organizationName?: string, organizationType?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  switchClientOrganization: (clientOrgId: string | null) => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantContext | null>(null);
  const [tenants, setTenants] = useState<TenantContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabase] = useState(() => {
    console.log("Auth provider: Creating Supabase client");
    return createClientComponentClient();
  });
  const router = useRouter();
  
  // Log provider initialization
  useEffect(() => {
    console.log("Auth provider: Component mounted");
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      console.log("Auth provider: Refreshing session...");
      setIsLoading(true);
      
      // Make a safe API call with timeout
      let data, error;
      // Safer approach for handling timeouts
      let sessionPromise = null;
      try {
        // Create a simple promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.log("Auth provider: Using default session data due to timeout");
            // Instead of rejecting, we'll resolve with empty data
            data = { session: null };
            error = null;
          }, 3000);
        });
        
        // Start the session fetch
        sessionPromise = supabase.auth.getSession();
        
        // Try to get the session, but don't wait forever
        const result = await sessionPromise;
        
        // If we get here, we got a result before timeout
        console.log("Auth provider: Session fetch completed successfully");
        data = result.data;
        error = result.error;
      } catch (e) {
        console.error("Auth provider: Error during session fetch:", e);
        // Use default empty session data instead of throwing
        data = { session: null };
        error = null;
      }
      
      if (error) {
        console.error("Auth provider: Session refresh error:", error.message);
        setError(error.message);
        setUser(null);
        setTenant(null);
        setTenants([]);
        return;
      }

      if (data?.session?.user) {
        console.log("Auth provider: Session found for user:", data.session.user.email);
        setUser(data.session.user);
        await fetchUserTenants(supabase, data.session.user);
      } else {
        console.log("Auth provider: No active session found");
        setUser(null);
        setTenant(null);
        setTenants([]);
      }
    } catch (error) {
      console.error('Auth provider: Error refreshing session:', error);
      setError('Failed to refresh session');
      // Reset state on error
      setUser(null);
      setTenant(null);
      setTenants([]);
    } finally {
      console.log("Auth provider: Session refresh completed");
      setIsLoading(false);
    }
  }, [supabase]);

  const fetchUserTenants = async (
  supabase: SupabaseClient,
  user: User
) => {
  try {
    console.log("Auth provider: Fetching tenants for user:", user.id);
    
    // Set a timeout to abort if it takes too long
    const fetchTimeout = setTimeout(() => {
      console.log("Auth provider: Tenant fetch timed out - using defaults");
      setTenants([]);
      setTenant(null);
    }, 3000);
    
    // Define helper function for syncing membership with retries
    const syncMembership = async (retryCount = 0, maxRetries = 3) => {
      try {
        console.log("Auth provider: Attempting to sync membership, attempt:", retryCount + 1);
        
        const syncResponse = await fetch('/api/auth/sync-membership', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (syncResponse.ok) {
          console.log("Auth provider: Membership sync successful");
          return true;
        } else {
          const errorData = await syncResponse.json();
          console.warn("Auth provider: Membership sync failed", errorData);
          
          if (retryCount < maxRetries) {
            // Exponential backoff - wait longer between retries
            const backoffTime = Math.pow(2, retryCount) * 300; // 300, 600, 1200ms
            console.log(`Auth provider: Retrying membership sync in ${backoffTime}ms`);
            
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            return syncMembership(retryCount + 1, maxRetries);
          }
          
          return false;
        }
      } catch (syncError) {
        console.error("Auth provider: Error syncing membership:", syncError);
        return false;
      }
    };
    
    // For a brand new user, create a default organization if none exists
    const organizationName = user.user_metadata?.full_name 
      ? `${user.user_metadata.full_name}'s Organization` 
      : "My Organization";
      
    // Default tenant for new users
    const defaultTenant = {
      organizationId: "default",
      organizationName: organizationName,
      organizationType: "service_provider",
      clientOrganizationId: null,
      clientOrganizationName: null,
      role: "owner",
      roleName: "Owner",
      permissions: ["*"],
    };
    
    // First, get the user's organization IDs
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select(`
        id,
        organization_id,
        role_id
      `)
      .eq('user_id', user.id);

    if (userOrgsError) {
      console.error('Auth provider: Error fetching user organizations:', userOrgsError);
      clearTimeout(fetchTimeout);
      setTenants([defaultTenant]);
      setTenant(defaultTenant);
      return;
    }

    if (!userOrgs || userOrgs.length === 0) {
      console.log("Auth provider: No organizations found, using default tenant");
      clearTimeout(fetchTimeout);
      setTenants([defaultTenant]);
      setTenant(defaultTenant);
      return;
    }

    // Now fetch the organization details separately
    const orgIds = userOrgs.map(org => org.organization_id);
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, organization_type')
      .in('id', orgIds);

    if (orgsError) {
      console.error('Auth provider: Error fetching organizations:', orgsError);
      clearTimeout(fetchTimeout);
      setTenants([defaultTenant]);
      setTenant(defaultTenant);
      return;
    }

    // Fetch role details
    const roleIds = userOrgs.map(org => org.role_id);
    const { data: roles, error: rolesError } = await supabase
      .from('system_roles')
      .select('id, name, permissions')
      .in('id', roleIds);

    if (rolesError) {
      console.error('Auth provider: Error fetching roles:', rolesError);
    }

    // Map the data together
    const tenantsList = userOrgs.map(userOrg => {
      const org = organizations?.find(o => o.id === userOrg.organization_id);
      const role = roles?.find(r => r.id === userOrg.role_id);
      
      return {
        organizationId: userOrg.organization_id,
        organizationName: org?.name || 'Unknown Organization',
        organizationType: org?.organization_type || 'service_provider',
        clientOrganizationId: null,
        clientOrganizationName: null,
        role: userOrg.role_id || 'member',
        roleName: role?.name || 'Member',
        permissions: role?.permissions || [],
      };
    });

    clearTimeout(fetchTimeout);
    
    console.log("Auth provider: Set tenants list with length:", tenantsList.length);
    setTenants(tenantsList);
    
    // Check if user has active_organization_id in metadata
    const hasOrgInMetadata = !!user.user_metadata?.active_organization_id;
    
    // Simplify tenant selection - just use the first one for now
    const activeTenant = tenantsList[0];
    console.log("Auth provider: Using first tenant as active:", activeTenant.organizationName);
    
    // If user doesn't have an organization ID in metadata, update it first
    if (!hasOrgInMetadata && activeTenant) {
      console.log("Auth provider: Updating user metadata with active organization ID");
      try {
        await supabase.auth.updateUser({
          data: { active_organization_id: activeTenant.organizationId }
        });
        
        // Wait a moment for the metadata update to propagate
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (updateError) {
        console.error("Auth provider: Error updating user metadata:", updateError);
      }
    }

    // Now try to sync membership with retries
    await syncMembership();
    
    // Set the tenant
    setTenant(activeTenant);
  } catch (error) {
    console.error('Auth provider: Error in fetchUserTenants:', error);
    // Don't fail the auth - just use an empty tenant
    setTenants([]);
    setTenant(null);
  }
};

  const switchTenant = async (tenantId: string) => {
    try {
      const selectedTenant = tenants.find(t => t.organizationId === tenantId);
      
      if (!selectedTenant) {
        setError('Invalid tenant selection');
        return;
      }
      
      // Update active tenant
      setTenant(selectedTenant);
      
      // Update user metadata with active organization
      await supabase.auth.updateUser({
        data: { active_organization_id: tenantId }
      });
      
      // Clear any client organization selection when switching tenants
      await supabase.rpc('switch_client_organization', {
        p_client_organization_id: null
      });
      
      // Refresh page to update context
      router.refresh();
    } catch (error) {
      console.error('Error switching tenant:', error);
      setError('Failed to switch organization');
    }
  };

  const switchClientOrganization = async (clientOrgId: string | null) => {
    try {
      if (!tenant) {
        setError('No active organization');
        return;
      }
      
      // Call the database function to switch client context
      const { data, error } = await supabase.rpc('switch_client_organization', {
        p_client_organization_id: clientOrgId
      });
      
      if (error) {
        console.error('Error switching client organization:', error);
        setError('Failed to switch client organization');
        return;
      }
      
      // Update local state (without full refresh if possible)
      if (clientOrgId) {
        // Fetch the client organization name
        const { data: clientData } = await supabase
          .from('client_organizations')
          .select('name')
          .eq('id', clientOrgId)
          .single();
          
        setTenant({
          ...tenant,
          clientOrganizationId: clientOrgId,
          clientOrganizationName: clientData?.name || 'Unknown Client'
        });
      } else {
        // Reset client organization when viewing all clients
        setTenant({
          ...tenant,
          clientOrganizationId: null,
          clientOrganizationName: null
        });
      }
      
      // Refresh page to update content based on new client selection
      router.refresh();
    } catch (error) {
      console.error('Error switching client organization:', error);
      setError('Failed to switch client view');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Auth provider: Attempting to sign in with Supabase...");
      
      // Set up timeout to handle stalled sign-in
      const signInTimeout = setTimeout(() => {
        console.error("Auth provider: Sign-in timeout");
        setError("Sign-in timed out. Please try again.");
        setIsLoading(false);
      }, 5000);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      clearTimeout(signInTimeout);
      
      if (error) {
        console.error("Auth provider: Sign-in error from Supabase:", error.message);
        setError(error.message);
        return false;
      }
      
      if (data?.user) {
        console.log("Auth provider: User authenticated successfully:", data.user.id);
        setUser(data.user);
        
        // Don't wait for tenant fetch to complete
        // Just trigger it and let the auth state listener handle it
        fetchUserTenants(supabase, data.user).catch(e => {
          console.error("Auth provider: Error fetching tenants during sign-in:", e);
        });
        
        // Return success immediately for a faster UX
        return true;
      }
      
      console.warn("Auth provider: No user data returned from sign-in");
      return false;
    } catch (error) {
      console.error('Auth provider: Error in signIn function:', error);
      setError('Failed to sign in. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Add the signUp function
  const signUp = async (email: string, password: string, fullName: string, organizationName?: string, organizationType: string = 'direct_client') => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Auth provider: Starting sign-up process');
      
      // Set up timeout to handle stalled sign-up
      const signUpTimeout = setTimeout(() => {
        console.error("Auth provider: Sign-up timeout");
        setError("Sign-up timed out. Please try again.");
        setIsLoading(false);
      }, 10000); // Longer timeout since this calls the Edge function
      
      // Call our Edge Function
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-up`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ email, password, fullName, organizationName, organizationType })
      });
      
      clearTimeout(signUpTimeout);
      
      console.log('Auth provider: Sign-up request completed with status:', response.status);
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Auth provider: Error parsing sign-up response:', jsonError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        console.error('Auth provider: Sign-up failed:', result.error);
        throw new Error(result.error || 'Failed to sign up');
      }
      
      console.log('Auth provider: Sign-up successful');
      
      // Simplified handling - let the registration page handle the redirect
      return true;
      
    } catch (error) {
      console.error('Auth provider: Error signing up:', error);
      setError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setTenant(null);
      setTenants([]);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("Auth provider: Setting up auth state");
    
    // We'll always force loading to end after a timeout as a failsafe
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log("Auth provider: Failsafe loading timeout reached, forcing loading state to false");
        setIsLoading(false);
      }
    }, 3000); // 3 second timeout
    
    // Simplified initialization sequence
    const initializeAuth = async () => {
      try {
        console.log("Auth provider: Starting simplified initialization");
        
        // Just check for an existing session
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          console.log("Auth provider: Session found during initialization");
          setUser(data.session.user);
          try {
            await fetchUserTenants(supabase, data.session.user);
          } catch (e) {
            console.error("Auth provider: Error fetching tenants:", e);
          }
        } else {
          console.log("Auth provider: No session found during initialization");
          setUser(null);
          setTenant(null);
          setTenants([]);
        }
      } catch (error) {
        console.error("Auth provider: Error in initialization:", error);
      } finally {
        // Always end loading regardless of outcome
        setIsLoading(false);
      }
    };
    
    initializeAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth provider: Auth state changed:", event);
        
        if (session?.user) {
          setUser(session.user);
          
          // Don't wait for tenant fetch in the callback to avoid blocking
          fetchUserTenants(supabase, session.user).catch(e => {
            console.error("Auth provider: Error fetching tenants after auth change:", e);
          });
        } else {
          setUser(null);
          setTenant(null);
          setTenants([]);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        tenants,
        isLoading,
        error,
        signIn,
        signUp,
        signOut,
        switchTenant,
        switchClientOrganization,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};