import { useEffect, useState, useRef } from "react";
import { useUser, useLogout } from "@/hooks/use-user";
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
  const { 
    data: user,
    isLoading
  } = useUser();
  const { mutateAsync: logout } = useLogout();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("profile");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
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

  useEffect(() => {
    const handleScroll = () => {
      const currentPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { top, bottom } = element.getBoundingClientRect();
          if (top <= 100 && bottom >= 100) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      queryClient.setQueryData(['user'], null);
      window.location.href = '/';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update profile');
      }

      await queryClient.invalidateQueries({ queryKey: ['user'] });

      toast({
        title: "Success",
        description: "Profile updated successfully",
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
    try {
      const parsedPrefs = PreferenceSchema.safeParse(newPreferences);
      if (!parsedPrefs.success) {
        throw new Error("Invalid preferences format");
      }

      setPreferences(parsedPrefs.data);
      setShowPreferences(false);

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
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1200px]">
        <div className="flex flex-col md:flex-row gap-6">
          <aside className="md:w-64 shrink-0">
            <div className="sticky top-4 space-y-4 rounded-lg border bg-card p-4 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your account settings and preferences
                </p>
              </div>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                      "hover:bg-accent hover:text-accent-foreground",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {section.icon}
                    <span className="ml-2">{section.title}</span>
                  </button>
                ))}
              </nav>
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </Button>
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="space-y-6 md:col-span-1">
                <section
                  ref={(el) => (sectionRefs.current.profile = el)}
                  id="profile"
                  className="scroll-mt-16"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your basic profile information
                      </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSubmit}>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
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
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
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
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </CardFooter>
                    </form>
                  </Card>
                </section>

                <section
                  ref={(el) => (sectionRefs.current.preferences = el)}
                  id="preferences"
                  className="scroll-mt-16"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Meal Preferences</CardTitle>
                      <CardDescription>
                        Manage your dietary preferences and restrictions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label>Dietary Preferences</Label>
                          <p className="text-sm text-muted-foreground">
                            {preferences.dietary.length > 0
                              ? preferences.dietary.join(", ")
                              : "No dietary preferences set"}
                          </p>
                        </div>
                        <div>
                          <Label>Allergies</Label>
                          <p className="text-sm text-muted-foreground">
                            {preferences.allergies.length > 0
                              ? preferences.allergies.join(", ")
                              : "No allergies set"}
                          </p>
                        </div>
                        <div>
                          <Label>Preferred Cuisines</Label>
                          <p className="text-sm text-muted-foreground">
                            {preferences.cuisine.length > 0
                              ? preferences.cuisine.join(", ")
                              : "No cuisine preferences set"}
                          </p>
                        </div>
                        <div>
                          <Label>Meat Preferences</Label>
                          <p className="text-sm text-muted-foreground">
                            {preferences.meatTypes.length > 0
                              ? preferences.meatTypes.join(", ")
                              : "No meat preferences set"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowPreferences(true)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Preferences
                      </Button>
                    </CardFooter>
                  </Card>
                </section>
              </div>

              <div className="space-y-6 md:col-span-1">
                <section
                  ref={(el) => (sectionRefs.current.subscription = el)}
                  id="subscription"
                  className="scroll-mt-16 md:sticky md:top-4"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Subscription Status</CardTitle>
                      <CardDescription>
                        Manage your subscription and billing settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SubscriptionManager />
                    </CardContent>
                  </Card>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      <PreferenceModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onUpdatePreferences={handlePreferencesSave}
        user={user ? {
          subscription_tier: user.subscription_tier,
          meal_plans_generated: user.meal_plans_generated
        } : undefined}
      />
    </div>
  );
}