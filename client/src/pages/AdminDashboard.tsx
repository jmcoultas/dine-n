import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  AlertTriangle, 
  Search, 
  Shield, 
  RefreshCw, 
  Link,
  Unlink,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Settings
} from 'lucide-react';
import { useLocation } from 'wouter';

interface UserSearchResult {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  subscription_tier: string;
  subscription_status: string;
  is_partial_registration: boolean;
  firebase_uid: string | null;
  is_admin: boolean;
}

interface UserDetails {
  user: {
    id: number;
    email: string;
    name: string | null;
    created_at: string;
    subscription_tier: string;
    subscription_status: string;
    is_partial_registration: boolean;
    firebase_uid: string | null;
    is_admin: boolean;
    password_hash: string;
  };
  firebase_status: {
    exists: boolean;
    email?: string;
    emailVerified?: boolean;
    disabled?: boolean;
    creationTime?: string;
    lastSignInTime?: string;
    error?: string;
  } | null;
  analysis: {
    user_state: 'normal' | 'partial' | 'limbo' | 'firebase_only' | 'problematic';
    issues: string[];
    recommendations: string[];
  };
  has_temporary_password: boolean;
  checked_at: string;
}

interface DashboardStats {
  stats: {
    total_users: number;
    admin_users: number;
    partial_registrations: number;
    premium_users: number;
    users_last_24h: number;
  };
  problematic_users: Array<{
    id: number;
    email: string;
    name: string | null;
    created_at: string;
    is_partial_registration: boolean;
    firebase_uid: string | null;
    subscription_tier: string;
  }>;
  potential_limbo_users: Array<{
    id: number;
    email: string;
    name: string | null;
    firebase_uid: string | null;
    created_at: string;
  }>;
  generated_at: string;
}

export default function AdminDashboard() {
  const { data: user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check admin status on component mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
        
        if (data.isAdmin) {
          loadDashboardData();
        }
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    }
  };

  const getUserDetails = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data);
      } else {
        throw new Error('Failed to get user details');
      }
    } catch (error) {
      console.error('Error getting user details:', error);
      toast({
        title: "Error",
        description: "Failed to get user details",
        variant: "destructive"
      });
    }
  };

  const performUserAction = async (userId: number, action: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/fix-limbo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
          variant: "default"
        });
        
        // Refresh user details
        await getUserDetails(userId);
        
        // Refresh dashboard data
        await loadDashboardData();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Action failed');
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAdminStatus = async (userId: number) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message,
          variant: "default"
        });
        
        // Refresh user details
        await getUserDetails(userId);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to toggle admin status');
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle admin status",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/')}
              className="w-full"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'normal': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'limbo': return 'bg-orange-100 text-orange-800';
      case 'firebase_only': return 'bg-blue-100 text-blue-800';
      case 'problematic': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">User management and troubleshooting tools</p>
          </div>
          <Button onClick={() => setLocation('/')} variant="outline">
            Back to App
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="search">User Search</TabsTrigger>
            <TabsTrigger value="issues">Known Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {dashboardData && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.total_users}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.admin_users}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Partial Registrations</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.partial_registrations}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Premium Users</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.premium_users}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">New (24h)</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.stats.users_last_24h}</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Problematic Users</CardTitle>
                      <CardDescription>
                        Users with partial registrations or temporary passwords
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dashboardData.problematic_users.slice(0, 10).map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{user.email}</p>
                              <p className="text-sm text-muted-foreground">
                                ID: {user.id} • {new Date(user.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {user.is_partial_registration && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                                  Partial
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => getUserDetails(user.id)}
                              >
                                Details
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Potential Limbo Users</CardTitle>
                      <CardDescription>
                        Users who might be stuck between Firebase and native DB
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dashboardData.potential_limbo_users.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{user.email}</p>
                              <p className="text-sm text-muted-foreground">
                                ID: {user.id} • Firebase: {user.firebase_uid ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => getUserDetails(user.id)}
                            >
                              Details
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Search</CardTitle>
                <CardDescription>
                  Search users by email, name, or ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Enter email, name, or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                  />
                  <Button onClick={searchUsers}>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.name} • ID: {user.id} • {user.subscription_tier}
                            {user.is_admin && <Badge className="ml-2">Admin</Badge>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.is_partial_registration && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Partial
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => getUserDetails(user.id)}
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedUser && (
              <Card>
                <CardHeader>
                  <CardTitle>User Details: {selectedUser.user.email}</CardTitle>
                  <CardDescription>
                    Detailed analysis and troubleshooting options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">User Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>ID:</strong> {selectedUser.user.id}</p>
                        <p><strong>Email:</strong> {selectedUser.user.email}</p>
                        <p><strong>Name:</strong> {selectedUser.user.name || 'Not set'}</p>
                        <p><strong>Created:</strong> {new Date(selectedUser.user.created_at).toLocaleString()}</p>
                        <p><strong>Subscription:</strong> {selectedUser.user.subscription_tier}</p>
                        <p><strong>Admin:</strong> {selectedUser.user.is_admin ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Technical Status</h4>
                      <div className="space-y-2">
                        <Badge className={getStateColor(selectedUser.analysis.user_state)}>
                          {selectedUser.analysis.user_state.toUpperCase()}
                        </Badge>
                        <div className="text-sm">
                          <p><strong>Partial Registration:</strong> {selectedUser.user.is_partial_registration ? 'Yes' : 'No'}</p>
                          <p><strong>Temporary Password:</strong> {selectedUser.has_temporary_password ? 'Yes' : 'No'}</p>
                          <p><strong>Firebase UID:</strong> {selectedUser.user.firebase_uid || 'None'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedUser.firebase_status && (
                    <div>
                      <h4 className="font-medium mb-2">Firebase Status</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Exists:</strong> {selectedUser.firebase_status.exists ? 'Yes' : 'No'}</p>
                        {selectedUser.firebase_status.exists && (
                          <>
                            <p><strong>Email Verified:</strong> {selectedUser.firebase_status.emailVerified ? 'Yes' : 'No'}</p>
                            <p><strong>Disabled:</strong> {selectedUser.firebase_status.disabled ? 'Yes' : 'No'}</p>
                            <p><strong>Last Sign In:</strong> {selectedUser.firebase_status.lastSignInTime || 'Never'}</p>
                          </>
                        )}
                        {selectedUser.firebase_status.error && (
                          <p className="text-red-600"><strong>Error:</strong> {selectedUser.firebase_status.error}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedUser.analysis.issues.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Issues Found:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {selectedUser.analysis.issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedUser.analysis.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {selectedUser.analysis.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => performUserAction(selectedUser.user.id, 'reset_to_partial')}
                      disabled={actionLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset to Partial
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => performUserAction(selectedUser.user.id, 'link_firebase')}
                      disabled={actionLoading}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Link Firebase
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => performUserAction(selectedUser.user.id, 'clear_firebase_uid')}
                      disabled={actionLoading}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Clear Firebase UID
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => performUserAction(selectedUser.user.id, 'complete_registration')}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Registration
                    </Button>

                    {selectedUser.user.id !== user?.id && (
                      <Button
                        size="sm"
                        variant={selectedUser.user.is_admin ? "destructive" : "default"}
                        onClick={() => toggleAdminStatus(selectedUser.user.id)}
                        disabled={actionLoading}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {selectedUser.user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="issues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Common Login Issues & Solutions</CardTitle>
                <CardDescription>
                  Guide for troubleshooting user login problems
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="font-medium">User in Limbo State</h4>
                    <p className="text-sm text-muted-foreground">
                      User exists in Firebase but not in native database, or vice versa.
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> Use "Link Firebase" or "Reset to Partial" actions.
                    </p>
                  </div>

                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-medium">Partial Registration</h4>
                    <p className="text-sm text-muted-foreground">
                      User started registration but didn't complete it.
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> User should use password reset or complete registration.
                    </p>
                  </div>

                  <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-medium">Firebase UID Mismatch</h4>
                    <p className="text-sm text-muted-foreground">
                      User has Firebase UID but the Firebase user doesn't exist.
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> Clear Firebase UID or manually create Firebase user.
                    </p>
                  </div>

                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">Temporary Password</h4>
                    <p className="text-sm text-muted-foreground">
                      User has a system-generated temporary password.
                    </p>
                    <p className="text-sm mt-1">
                      <strong>Solution:</strong> User should use password reset to set a real password.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 