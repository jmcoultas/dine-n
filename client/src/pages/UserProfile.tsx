import { useEffect, useState, useRef } from "react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, Settings, User, CreditCard, LogOut } from "lucide-react";
import PreferenceModal from "@/components/PreferenceModal";
import { PreferenceSchema } from "@db/schema";
import type { Preferences } from "@db/schema";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { cn } from "@/lib/utils";

interface ProfileFormData {
  name: string;
  email: string;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const sections: Section[] = [
  { id: "profile", title: "Profile", icon: <User className="h-4 w-4" /> },
  { id: "preferences", title: "Preferences", icon: <Settings className="h-4 w-4" /> },
  { id: "subscription", title: "Subscription", icon: <CreditCard className="h-4 w-4" /> },
];

export default function UserProfile() {
  const { user, isLoading, logout } = useUser();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("profile");
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
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
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="container max-w-screen-xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-64 shrink-0">
          <div className="sticky top-8 space-y-1 bg-card rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Navigation</h2>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-muted/50",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/60 hover:text-foreground"
                )}
              >
                {section.icon}
                <span className="ml-3">{section.title}</span>
              </button>
            ))}
            <Button
              variant="destructive"
              className="w-full mt-4"
              onClick={() => {
                logout().then(() => {
                  toast({
                    title: "Success",
                    description: "You have been logged out",
                  });
                });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <section
            ref={(el: HTMLDivElement | null) => sectionRefs.current.profile = el}
            id="profile"
            className="scroll-mt-16"
          >
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your basic profile information
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
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
          </section>

          <section
            ref={(el: HTMLDivElement | null) => sectionRefs.current.subscription = el}
            id="subscription"
            className="scroll-mt-16"
          >
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
                <CardDescription>
                  Manage your subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionManager />
              </CardContent>
            </Card>
          </section>

          <section
            ref={(el: HTMLDivElement | null) => sectionRefs.current.preferences = el}
            id="preferences"
            className="scroll-mt-16"
          >
            <Card className="shadow-sm">
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
          </section>
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