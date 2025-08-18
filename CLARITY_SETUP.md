# Microsoft Clarity Analytics Setup

Microsoft Clarity has been successfully installed and integrated into your platform to help you understand user behavior through session recordings and heatmaps.

## Setup Instructions

### 1. Get Your Clarity Project ID

1. Go to [Microsoft Clarity](https://clarity.microsoft.com/)
2. Sign in with your Microsoft account
3. Create a new project or select an existing one
4. Copy your Project ID from the project settings

### 2. Configure Environment Variables

Create a `.env` file in the `client/` directory (if it doesn't exist) and add:

```env
VITE_CLARITY_PROJECT_ID=your_clarity_project_id_here
```

Replace `your_clarity_project_id_here` with your actual Clarity project ID.

### 3. Features Available

The integration provides the following features:

#### Automatic Initialization
- Clarity is automatically initialized when your app starts
- User identification happens automatically when users log in
- User segmentation tags are set based on registration status

#### Manual Tracking (Optional)
You can import and use the Clarity service for custom tracking:

```typescript
import { ClarityService } from '@/lib/clarity';

// Track custom events
ClarityService.event('button_clicked');

// Set custom tags
ClarityService.setTag('feature_used', 'meal_planning');

// Upgrade session for priority recording
ClarityService.upgrade('important_user_action');

// Set user consent (for GDPR compliance)
ClarityService.consent(true);
```

### 4. User Privacy & Consent

The integration respects user privacy:
- You can set user consent using `ClarityService.consent(false)` to disable tracking
- Consider implementing a cookie consent banner that calls this method
- Users are identified by their user ID, not personal information

### 5. Verification

After setting up your project ID:

1. Start your development server: `npm run dev`
2. Open your browser's Developer Tools
3. Go to the Network tab
4. Navigate through your app
5. Look for POST requests to `https://www.clarity.ms/collect`
6. Check your Clarity dashboard for incoming data

### 6. Analytics Data Available

With this setup, you'll be able to see:
- User session recordings
- Heatmaps of user interactions
- User journey flows
- Performance metrics
- Custom events and tags
- User segmentation (complete vs partial registrations)

### 7. Troubleshooting

If Clarity isn't working:
1. Check that `VITE_CLARITY_PROJECT_ID` is set correctly
2. Verify the project ID in your Clarity dashboard
3. Check browser console for any error messages
4. Ensure your domain is allowed in Clarity project settings

### 8. Files Modified

The following files were modified during installation:
- `client/src/lib/clarity.ts` - Clarity service wrapper
- `client/src/main.tsx` - Initialization and user identification
- `client/package.json` - Added @microsoft/clarity dependency

### 9. Next Steps

1. Set up your Clarity project ID in the environment variables
2. Deploy your app and verify data collection in Clarity dashboard
3. Set up custom events for key user actions (recipe views, meal plan creation, etc.)
4. Configure alerts and insights in your Clarity dashboard
