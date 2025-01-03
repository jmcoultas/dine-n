import { useState } from "react";
import { useLocation, useRouter } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useLocation();

  // Get token and userId from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  if (!token || !userId) {
    return (
      <div className="container flex-col items-center justify-center min-h-screen">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => setLocation('/auth')}
              className="w-full"
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          userId: parseInt(userId),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      toast({
        title: "Success",
        description: "Password reset successful. Please log in with your new password.",
      });

      setLocation('/auth');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex-col items-center justify-center min-h-screen">
      <Card className="w-full max-w-md mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Please enter your new password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
