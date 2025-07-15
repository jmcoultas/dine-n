// Mock functions for Storybook environment
export const mockUseToast = () => ({
  toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    console.log(`Toast: ${title} - ${description} (${variant || 'default'})`);
  }
});

export const mockUseMediaQuery = (query: string) => {
  // Default to desktop view for Storybook
  if (query.includes('640px')) return false;
  return true;
};

export const mockCelebrate = () => {
  console.log('🎉 Celebrate!');
};

export const mockCelebrateOnboarding = () => {
  console.log('🎊 Onboarding celebration!');
};

// Global mocks for Storybook
if (typeof window !== 'undefined') {
  // Mock fetch for Storybook environment
  if (!window.fetch) {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      console.log(`Mock fetch: ${input}`, init);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
  }
} 