import clarity from '@microsoft/clarity';

// Clarity configuration
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || '';

export class ClarityService {
  private static isInitialized = false;
  private static hasConsent = false;

  /**
   * Initialize Microsoft Clarity with the project ID
   * Should be called once when the app starts
   */
  static init() {
    if (this.isInitialized || !CLARITY_PROJECT_ID) {
      if (!CLARITY_PROJECT_ID) {
        console.warn('Clarity project ID not found. Please set VITE_CLARITY_PROJECT_ID in your environment variables.');
      }
      return;
    }

    // Check for stored consent before initializing
    const storedConsent = localStorage.getItem('clarity-consent');
    // Default to true if no previous decision has been made (first time users)
    this.hasConsent = storedConsent === null ? true : storedConsent === 'true';

    try {
      clarity.init(CLARITY_PROJECT_ID);
      this.isInitialized = true;
      
      // Set initial consent state
      clarity.consent(this.hasConsent);
      
      console.log('Microsoft Clarity initialized successfully', { hasConsent: this.hasConsent });
    } catch (error) {
      console.error('Failed to initialize Microsoft Clarity:', error);
    }
  }

  /**
   * Identify a user with custom ID and optional metadata
   * @param customId - Custom user identifier
   * @param sessionId - Optional custom session ID
   * @param pageId - Optional custom page ID
   * @param friendlyName - Optional friendly name for the user
   */
  static identify(
    customId: string,
    sessionId?: string,
    pageId?: string,
    friendlyName?: string
  ) {
    if (!this.isInitialized || !this.hasConsent) {
      console.warn('Clarity not initialized or consent not given. Skipping identify.');
      return;
    }

    try {
      clarity.identify(customId, sessionId, pageId, friendlyName);
    } catch (error) {
      console.error('Failed to identify user in Clarity:', error);
    }
  }

  /**
   * Set a custom tag for the current session
   * @param key - Tag key
   * @param value - Tag value
   */
  static setTag(key: string, value: string) {
    if (!this.isInitialized || !this.hasConsent) {
      console.warn('Clarity not initialized or consent not given. Skipping setTag.');
      return;
    }

    try {
      clarity.setTag(key, value);
    } catch (error) {
      console.error('Failed to set Clarity tag:', error);
    }
  }

  /**
   * Track a custom event
   * @param eventName - Name of the custom event
   */
  static event(eventName: string) {
    if (!this.isInitialized || !this.hasConsent) {
      console.warn('Clarity not initialized or consent not given. Skipping event tracking.');
      return;
    }

    try {
      clarity.event(eventName);
    } catch (error) {
      console.error('Failed to track Clarity event:', error);
    }
  }

  /**
   * Set user consent for tracking
   * @param hasConsent - Whether user has given consent
   */
  static consent(hasConsent: boolean) {
    this.hasConsent = hasConsent;
    
    if (!this.isInitialized) {
      console.warn('Clarity not initialized. Call ClarityService.init() first.');
      return;
    }

    try {
      clarity.consent(hasConsent);
      console.log('Clarity consent updated:', { hasConsent });
    } catch (error) {
      console.error('Failed to set Clarity consent:', error);
    }
  }

  /**
   * Upgrade the current session for priority recording
   * @param reason - Reason for upgrading the session
   */
  static upgrade(reason: string) {
    if (!this.isInitialized || !this.hasConsent) {
      console.warn('Clarity not initialized or consent not given. Skipping session upgrade.');
      return;
    }

    try {
      clarity.upgrade(reason);
    } catch (error) {
      console.error('Failed to upgrade Clarity session:', error);
    }
  }

  /**
   * Get the current initialization status
   */
  static getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}

// Export individual functions for convenience
export const {
  init: initClarity,
  identify: identifyUser,
  setTag: setClarityTag,
  event: trackEvent,
  consent: setClarityConsent,
  upgrade: upgradeSession,
} = ClarityService;
