import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Cookie, Shield, BarChart3, ExternalLink } from 'lucide-react';
import { useCookieConsent } from './CookieConsent';
import { useToast } from '@/components/ui/use-toast';

interface CookieSettingsProps {
  onClose?: () => void;
}

export function CookieSettings({ onClose }: CookieSettingsProps) {
  const { hasConsent, updateConsent } = useCookieConsent();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(hasConsent ?? true); // Default to true if no previous decision
  const { toast } = useToast();

  const handleSave = () => {
    updateConsent(analyticsEnabled);
    toast({
      title: "Cookie preferences saved",
      description: analyticsEnabled 
        ? "Analytics cookies are now enabled" 
        : "Analytics cookies are now disabled",
    });
    onClose?.();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Cookie className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto" />
        <h2 className="text-2xl font-bold">Cookie Settings</h2>
        <p className="text-muted-foreground">
          Manage your cookie preferences and control what data we collect
        </p>
      </div>

      <div className="space-y-4">
        {/* Essential Cookies */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle className="text-lg">Essential Cookies</CardTitle>
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                  Always On
                </Badge>
              </div>
            </div>
            <CardDescription>
              These cookies are necessary for the website to function and cannot be disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <strong>What we collect:</strong>
              <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
                <li>Login session information</li>
                <li>User preferences and settings</li>
                <li>Security tokens</li>
                <li>Form data temporarily stored</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Cookies */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-lg">Analytics Cookies</CardTitle>
                <Badge variant="outline">Optional</Badge>
              </div>
              <Switch
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
                aria-label="Toggle analytics cookies"
              />
            </div>
            <CardDescription>
              Help us understand how you use our website to improve your experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <strong>What we collect with Microsoft Clarity:</strong>
              <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
                <li>Mouse movements, clicks, and scrolling behavior</li>
                <li>Page views and navigation patterns</li>
                <li>Session recordings and heatmaps</li>
                <li>Device and browser information</li>
                <li>Time spent on pages</li>
              </ul>
            </div>
            
            <div className="text-sm">
              <strong>How this helps us:</strong>
              <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
                <li>Identify usability issues and improve user experience</li>
                <li>Understand which features are most valuable</li>
                <li>Optimize page layouts and navigation</li>
                <li>Detect and prevent fraud or security issues</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Privacy Note:</strong> All analytics data is processed securely and never sold to third parties.
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Learn more:</div>
              <div className="space-y-1">
                <a 
                  href="https://privacy.microsoft.com/privacystatement" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Microsoft Privacy Statement <ExternalLink className="h-3 w-3" />
                </a>
                <br />
                <a 
                  href="https://clarity.microsoft.com/terms" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Microsoft Clarity Terms <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={handleSave} className="flex-1">
          Save Preferences
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        )}
      </div>

      <div className="text-xs text-center text-muted-foreground">
        You can change these settings at any time. Changes will take effect immediately.
      </div>
    </div>
  );
}

