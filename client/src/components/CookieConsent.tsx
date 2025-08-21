import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Settings, Cookie } from 'lucide-react';
import { ClarityService } from '@/lib/clarity';

interface CookieConsentProps {
  onConsentChange?: (hasConsent: boolean) => void;
}

export function CookieConsent({ onConsentChange }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check if user has already made a consent decision
    const consentDecision = localStorage.getItem('clarity-consent');
    const consentTimestamp = localStorage.getItem('clarity-consent-timestamp');
    
    // Show banner if no decision made or if decision is older than 1 year
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    const shouldShowBanner = !consentDecision || 
      (consentTimestamp && parseInt(consentTimestamp) < oneYearAgo);
    
    if (shouldShowBanner) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Apply stored consent decision
      const hasConsent = consentDecision === 'true';
      ClarityService.consent(hasConsent);
      onConsentChange?.(hasConsent);
    }
  }, [onConsentChange]);

  const handleConsent = (consent: boolean) => {
    // Store consent decision
    localStorage.setItem('clarity-consent', consent.toString());
    localStorage.setItem('clarity-consent-timestamp', Date.now().toString());
    
    // Apply to Clarity
    ClarityService.consent(consent);
    onConsentChange?.(consent);
    
    // Hide banner
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    handleConsent(true);
  };

  const handleRejectAll = () => {
    handleConsent(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-sm mb-2">We use cookies to improve your experience</h3>
                {showSettings ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      We use Microsoft Clarity to understand how you interact with our website through session recordings and heatmaps. This helps us improve your experience.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <div className="text-xs font-medium">Essential Cookies</div>
                          <div className="text-xs text-muted-foreground">Required for the site to function</div>
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">Always On</div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <div className="text-xs font-medium">Analytics Cookies</div>
                          <div className="text-xs text-muted-foreground">Help us understand usage patterns</div>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Optional</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleRejectAll}
                        className="flex-1 text-xs"
                      >
                        Reject Analytics
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleAcceptAll}
                        className="flex-1 text-xs"
                      >
                        Accept All
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      We use analytics cookies to improve your experience. You can choose which cookies you're comfortable with.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setShowSettings(true)}
                        className="flex-1 text-xs"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Customize
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleAcceptAll}
                        className="flex-1 text-xs"
                      >
                        Accept All
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing cookie consent in other components
export function useCookieConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const consentDecision = localStorage.getItem('clarity-consent');
    // Default to true if no previous decision has been made
    setHasConsent(consentDecision === null ? true : consentDecision === 'true');
  }, []);

  const updateConsent = (consent: boolean) => {
    localStorage.setItem('clarity-consent', consent.toString());
    localStorage.setItem('clarity-consent-timestamp', Date.now().toString());
    setHasConsent(consent);
    ClarityService.consent(consent);
  };

  return { hasConsent, updateConsent };
}

