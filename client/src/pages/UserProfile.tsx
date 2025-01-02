import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Settings } from "lucide-react";
import PreferenceModal from "@/components/PreferenceModal";
import { PreferenceSchema } from "@db/schema";
import type { Preferences } from "@db/schema";
import { SubscriptionManager } from "@/components/SubscriptionManager";

interface ProfileFormData {
  name: string;
  email: string;
}

export default function UserProfile() {
  const { user, isLoading, logout } = useUser();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });

      if (user.preferences) {
        const parsedPrefs = PreferenceSchema.safeParse(user.preferences);
        if (parsedPrefs.success) {
          setPreferences(parsedPrefs.data);
        } else {
          setPreferences({
            dietary: [],
            allergies: [],
            cuisine: [],
            meatTypes: [],
          });
        }
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedName = formData.name.trim();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!normalizedName) {
        throw new Error("Name is required");
      }

      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          preferences
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "Validation Error") {
          throw new Error(data.message);
        }
        throw new Error(data.message || 'Failed to update profile');
      }

      await queryClient.invalidateQueries({ queryKey: ['user'] });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setFormData({
        name: normalizedName,
        email: normalizedEmail,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreferencesSave = async (newPreferences: Preferences) => {
    const parsedPrefs = PreferenceSchema.safeParse(newPreferences);
    if (!parsedPrefs.success) {
      toast({
        title: "Error",
        description: "Invalid preferences format",
        variant: "destructive",
      });
      return;
    }

    setPreferences(parsedPrefs.data);
    setShowPreferences(false);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          preferences: parsedPrefs.data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      await queryClient.invalidateQueries({ queryKey: ['user'] });

      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update preferences",
        variant: "destructive",
      });

      if (user?.preferences) {
        const parsedPrefs = PreferenceSchema.safeParse(user.preferences);
        if (parsedPrefs.success) {
          setPreferences(parsedPrefs.data);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p>Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column - 2/3 width */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your basic profile information
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Meal Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle>Meal Preferences</CardTitle>
              <CardDescription>
                Manage your dietary preferences, allergies, and cuisine choices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dietary Preferences</Label>
                    <p className="text-sm text-muted-foreground">
                      {preferences.dietary.length > 0
                        ? preferences.dietary.join(", ")
                        : "No dietary preferences set"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Allergies</Label>
                    <p className="text-sm text-muted-foreground">
                      {preferences.allergies.length > 0
                        ? preferences.allergies.join(", ")
                        : "No allergies set"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Preferred Cuisines</Label>
                    <p className="text-sm text-muted-foreground">
                      {preferences.cuisine.length > 0
                        ? preferences.cuisine.join(", ")
                        : "No cuisine preferences set"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Meat Preferences</Label>
                    <p className="text-sm text-muted-foreground">
                      {preferences.meatTypes.length > 0
                        ? preferences.meatTypes.join(", ")
                        : "No meat preferences set"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreferences(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Edit Preferences
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="md:col-span-1 space-y-6">
          {/* Subscription Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionManager />
            </CardContent>
          </Card>

          {/* Account Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  logout().then(() => {
                    toast({
                      title: "Success",
                      description: "You have been logged out",
                    });
                  });
                }}
              >
                Log Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PreferenceModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onUpdatePreferences={handlePreferencesSave}
      />
    </div>
  );
}