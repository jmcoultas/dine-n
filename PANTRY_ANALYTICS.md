# Pantry Analytics Feature Specification
## Smart Insights & Waste Reduction (Premium Feature)

## Overview
Pantry Analytics transforms raw pantry data into actionable insights, helping premium users reduce food waste, save money, and optimize their grocery shopping. This feature analyzes usage patterns, tracks waste, and provides personalized recommendations.

## User Stories

### Primary Use Cases
1. **As a sustainability-focused user**, I want to see how much food waste I'm preventing
2. **As a budget-conscious shopper**, I want to understand my spending patterns and save money
3. **As a busy parent**, I want automatic shopping suggestions based on my usage patterns
4. **As a health-conscious user**, I want to ensure I'm maintaining a balanced pantry
5. **As a data-driven cook**, I want to see trends in what I cook and eat

## Feature Goals

### MVP Requirements
- Usage tracking visualization (what's being used vs. wasted)
- Waste reduction insights (expired items tracking)
- Shopping pattern analysis
- Expiration alerts with proactive suggestions
- Monthly summary reports
- Premium feature gating

### Enhanced Features (v2)
- Cost tracking and savings calculator
- Nutritional balance analysis
- Family member usage tracking
- Predictive shopping list generation
- Seasonal trends and recommendations
- Carbon footprint tracking

## Technical Architecture

### Backend Endpoints

**Note:** These endpoints need to be implemented on the backend.

#### Get Analytics Overview
```
GET /api/pantry/analytics
Authorization: Bearer <firebase-token>
X-Subscription-Check: Required (Premium only)

Query Parameters:
- period: "week" | "month" | "quarter" | "year"
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)

Response:
{
  "period": "month",
  "startDate": "2025-11-01",
  "endDate": "2025-12-01",
  "summary": {
    "totalItemsAdded": 47,
    "totalItemsUsed": 38,
    "totalItemsExpired": 5,
    "wasteReductionRate": 89.5,  // % of items used vs expired
    "estimatedMoneySaved": 45.00,
    "carbonFootprintSaved": 12.5  // kg CO2
  },
  "usage": {
    "topUsedCategories": [
      { "category": "produce", "count": 15, "percentage": 39.5 },
      { "category": "dairy", "count": 10, "percentage": 26.3 },
      { "category": "proteins", "count": 8, "percentage": 21.1 }
    ],
    "leastUsedCategories": [
      { "category": "spices", "count": 1, "percentage": 2.6 }
    ]
  },
  "waste": {
    "expiredItems": [
      {
        "id": "item_abc123",
        "name": "Milk",
        "category": "dairy",
        "quantity": 0.5,
        "unit": "gallons",
        "expirationDate": "2025-11-28",
        "daysExpiredBefore": 3,
        "estimatedCost": 4.50
      }
    ],
    "totalWasteValue": 22.50,
    "mostWastedCategory": "produce",
    "wasteByCategory": {
      "produce": 3,
      "dairy": 2
    }
  },
  "insights": [
    {
      "type": "waste_pattern",
      "title": "You often waste produce",
      "description": "3 produce items expired this month. Consider buying smaller quantities.",
      "actionable": true,
      "action": "Adjust shopping habits",
      "icon": "🥬"
    },
    {
      "type": "savings",
      "title": "You saved $45 this month!",
      "description": "By using 89% of your pantry items, you avoided $45 in food waste.",
      "actionable": false,
      "icon": "💰"
    },
    {
      "type": "expiring_soon",
      "title": "3 items expiring this week",
      "description": "Use tomatoes, lettuce, and cheese before they expire.",
      "actionable": true,
      "action": "View recipes",
      "icon": "⏰"
    }
  ],
  "trends": {
    "monthlyComparison": {
      "currentMonth": { "added": 47, "used": 38, "expired": 5 },
      "previousMonth": { "added": 52, "used": 35, "expired": 8 },
      "improvement": "You reduced waste by 37.5% this month!"
    },
    "usageByWeek": [
      { "week": "Week 1", "added": 12, "used": 8 },
      { "week": "Week 2", "added": 10, "used": 10 },
      { "week": "Week 3", "added": 15, "used": 12 },
      { "week": "Week 4", "added": 10, "used": 8 }
    ]
  },
  "recommendations": [
    {
      "type": "shopping",
      "title": "Buy less produce",
      "description": "You bought 15 produce items but only used 12. Consider reducing by 20%.",
      "priority": "high"
    },
    {
      "type": "usage",
      "title": "You have idle spices",
      "description": "You haven't used 8 spices in 3 months. Try new recipes!",
      "priority": "low"
    }
  ]
}

Error Responses:
- 403: Not a premium subscriber
- 400: Invalid date range
```

#### Get Waste History
```
GET /api/pantry/analytics/waste-history
Authorization: Bearer <firebase-token>
X-Subscription-Check: Required (Premium only)

Query Parameters:
- limit: number (default 20)

Response:
{
  "wastedItems": [
    {
      "name": "Milk",
      "category": "dairy",
      "quantity": 0.5,
      "unit": "gallons",
      "expirationDate": "2025-11-28",
      "wastedDate": "2025-12-01",
      "reason": "expired",
      "estimatedCost": 4.50
    }
  ],
  "totalWasteValue": 127.50,  // All-time
  "totalItemsWasted": 23
}
```

#### Track Item Usage
```
POST /api/pantry/items/{itemId}/mark-used
Authorization: Bearer <firebase-token>

Request Body:
{
  "quantityUsed": 2,  // All or partial
  "usedInRecipe": "rec_abc123",  // Optional recipe link
  "usedDate": "2025-12-02"  // Optional, defaults to now
}

Response:
{
  "message": "Item usage tracked",
  "item": { ... },  // Updated item
  "remainingQuantity": 0  // Will auto-delete if 0
}
```

### Database Schema

```sql
-- Track when items are used vs expired
CREATE TABLE pantry_usage_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255),  -- NULL if item deleted
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,  -- 'used', 'expired', 'added'
  event_date TIMESTAMP NOT NULL,
  recipe_id VARCHAR(255),  -- If used in a recipe
  estimated_cost DECIMAL(10,2),  -- For waste calculations
  notes TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, event_date),
  INDEX idx_event_type (event_type)
);

-- Cached analytics for performance
CREATE TABLE pantry_analytics_cache (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  period VARCHAR(50) NOT NULL,  -- 'month', 'quarter', 'year'
  data JSON NOT NULL,  -- Cached analytics JSON
  calculated_at TIMESTAMP NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### iOS Implementation

#### File Structure
```
Views/
  Pantry/
    PantryAnalyticsView.swift         ← NEW (main analytics dashboard)
    WasteReductionCard.swift          ← NEW (waste reduction metric)
    UsageChartView.swift              ← NEW (usage charts)
    InsightsListView.swift            ← NEW (actionable insights)
    WasteHistoryView.swift            ← NEW (waste tracking)
    MonthlyReportView.swift           ← NEW (monthly summary)

Models/
  PantryAnalytics.swift               ← NEW (analytics models)
  UsageEvent.swift                    ← NEW (usage tracking)
  PantryInsight.swift                 ← NEW (insight model)

Managers/
  PantryAnalyticsManager.swift        ← NEW (API integration)
```

#### Key Components

**PantryAnalytics.swift**
```swift
struct PantryAnalyticsSummary: Codable {
    let period: String
    let startDate: Date
    let endDate: Date
    let summary: AnalyticsSummary
    let usage: UsageAnalytics
    let waste: WasteAnalytics
    let insights: [PantryInsight]
    let trends: TrendAnalytics
    let recommendations: [Recommendation]
}

struct AnalyticsSummary: Codable {
    let totalItemsAdded: Int
    let totalItemsUsed: Int
    let totalItemsExpired: Int
    let wasteReductionRate: Double
    let estimatedMoneySaved: Double
    let carbonFootprintSaved: Double
}

struct PantryInsight: Identifiable, Codable {
    let id = UUID()
    let type: InsightType
    let title: String
    let description: String
    let actionable: Bool
    let action: String?
    let icon: String

    enum InsightType: String, Codable {
        case wastePattern = "waste_pattern"
        case savings = "savings"
        case expiringSoon = "expiring_soon"
        case usagePattern = "usage_pattern"
    }
}
```

**PantryAnalyticsView.swift**
```swift
struct PantryAnalyticsView: View {
    @StateObject private var analyticsManager = PantryAnalyticsManager()
    @EnvironmentObject var authManager: AuthManager

    @State private var selectedPeriod: AnalyticsPeriod = .month
    @State private var analytics: PantryAnalyticsSummary?

    enum AnalyticsPeriod: String, CaseIterable {
        case week = "Week"
        case month = "Month"
        case quarter = "Quarter"
        case year = "Year"
    }

    var body: some View {
        // Premium check
        if !authManager.user?.isPremium {
            AnalyticsPaywall()
        } else {
            ScrollView {
                // Period selector
                // Summary cards (waste reduction, money saved)
                // Usage charts
                // Insights list
                // Recommendations
                // Waste history
            }
        }
    }
}
```

## UI/UX Design

### Main Analytics Dashboard

```
┌─────────────────────────────────┐
│  < Back    Analytics            │
├─────────────────────────────────┤
│ Period: [Week][Month][Quarter]  │
│         November 2025           │
├─────────────────────────────────┤
│                                 │
│  📊 MONTHLY SUMMARY             │
│                                 │
│  ┌──────────────┬────────────┐  │
│  │ Waste Reduced│ Money Saved│  │
│  │              │            │  │
│  │    89.5%     │   $45.00   │  │
│  │   🎯 Great!  │   💰       │  │
│  └──────────────┴────────────┘  │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Carbon Footprint Saved   │   │
│  │      12.5 kg CO₂         │   │
│  │   🌱 Equivalent to...    │   │
│  └──────────────────────────┘   │
│                                 │
│  📈 USAGE TRENDS                │
│  ┌──────────────────────────┐   │
│  │      [Bar Chart]         │   │
│  │  Items Added vs Used     │   │
│  │                          │   │
│  │  Week 1  Week 2  Week 3  │   │
│  │  █ Added  █ Used         │   │
│  └──────────────────────────┘   │
│                                 │
│  💡 INSIGHTS (3)                │
│  ┌──────────────────────────┐   │
│  │ ⏰ 3 items expiring soon │   │
│  │ View recipes using them →│   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ 🥬 You often waste produce│   │
│  │ Consider smaller portions│   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ 💰 You saved $45!        │   │
│  │ Great job reducing waste │   │
│  └──────────────────────────┘   │
│                                 │
│  🗑️ WASTE HISTORY             │
│  ┌──────────────────────────┐   │
│  │ Nov 28: Milk ($4.50)     │   │
│  │ Nov 25: Lettuce ($2.99)  │   │
│  │ Nov 20: Tomatoes ($3.50) │   │
│  │ [View all →]             │   │
│  └──────────────────────────┘   │
│                                 │
│  🛒 RECOMMENDATIONS            │
│  ┌──────────────────────────┐   │
│  │ Buy 20% less produce     │   │
│  │ You wasted 3/15 items    │   │
│  └──────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

### Waste Reduction Card (Gamification)

```
┌─────────────────────────────────┐
│   Waste Reduction Rate          │
├─────────────────────────────────┤
│                                 │
│          89.5%                  │
│      ━━━━━━━━━━━                │
│                                 │
│   🎯 Excellent!                 │
│                                 │
│   You used 38 of 43 items       │
│   Only 5 items expired          │
│                                 │
│   ┌──────────────────────────┐  │
│   │ Your Goal: 90%           │  │
│   │ Community Avg: 75%       │  │
│   └──────────────────────────┘  │
│                                 │
│   +5% from last month 📈        │
│                                 │
└─────────────────────────────────┘
```

### Monthly Report (Shareable)

```
┌─────────────────────────────────┐
│   November 2025 Report    [Share]│
├─────────────────────────────────┤
│                                 │
│   📊 Your Impact                │
│                                 │
│   ✅ 38 items used              │
│   ⏰ 5 items expired            │
│   💰 $45 saved                  │
│   🌱 12.5 kg CO₂ saved          │
│                                 │
│   Top Categories Used:          │
│   1. 🥬 Produce (15 items)      │
│   2. 🥛 Dairy (10 items)        │
│   3. 🍗 Proteins (8 items)      │
│                                 │
│   Improvement Areas:            │
│   • Buy less produce (-20%)     │
│   • Use spices more often       │
│                                 │
│   [Download PDF] [Share]        │
│                                 │
└─────────────────────────────────┘
```

## User Flows

### View Analytics Flow
1. User navigates to "Analytics" tab in Pantry section
2. System checks premium status
   - If not premium: Show analytics paywall
   - If premium: Load analytics data
3. Default view shows current month
4. User can switch periods (Week/Month/Quarter/Year)
5. Analytics refresh with new data
6. User scrolls through:
   - Summary metrics
   - Usage charts
   - Insights
   - Waste history
   - Recommendations

### Take Action on Insight Flow
1. User sees insight: "3 items expiring soon"
2. User taps "View recipes"
3. System opens PantryPal with expiring ingredients pre-loaded
4. User generates recipes using those ingredients
5. User cooks recipe, marks ingredients as used
6. Analytics update to reflect waste prevented

### View Monthly Report Flow
1. User taps "Monthly Report"
2. Full-screen report appears
3. User reviews all metrics and insights
4. User taps "Share" button
5. Share sheet appears with:
   - Instagram story format (image)
   - PDF download
   - Copy stats to clipboard

## Premium Gating

### Analytics Paywall
```
┌─────────────────────────────────┐
│    Pantry Analytics 🔒          │
├─────────────────────────────────┤
│                                 │
│       [Analytics Icon]          │
│                                 │
│  Unlock Powerful Insights       │
│                                 │
│  ✨ Track waste reduction       │
│  ✨ See money saved             │
│  ✨ Get shopping recommendations│
│  ✨ Reduce carbon footprint     │
│  ✨ Monthly impact reports      │
│                                 │
│  Premium Feature - $4.99/mo     │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Upgrade to Premium       │ │
│  └───────────────────────────┘ │
│                                 │
│       [Maybe Later]             │
│                                 │
└─────────────────────────────────┘
```

## Gamification & Engagement

### Achievement Badges
- 🏆 **Zero Waste Week**: No items expired for 7 days
- 🌟 **Super Saver**: Saved $100+ in a month
- 🌱 **Eco Warrior**: Prevented 50kg CO₂ emissions
- 📊 **Data Master**: Viewed analytics 10 times

### Streaks
- **Days without waste**: Track consecutive days with no expired items
- **Monthly improvement**: Track consecutive months with improved waste reduction

### Social Sharing
- Share monthly reports to Instagram/Twitter
- Compare anonymously with community averages
- Challenge friends to reduce waste

## Analytics Calculations

### Waste Reduction Rate
```
wasteReductionRate = (itemsUsed / (itemsUsed + itemsExpired)) * 100

Example:
38 items used, 5 items expired
(38 / (38 + 5)) * 100 = 88.37%
```

### Money Saved
```
moneySaved = SUM(itemsUsed * estimatedCost)

Assumes if item was used, it wasn't wasted and saved its cost.
Requires cost estimation per category or manual input.
```

### Carbon Footprint
```
carbonSaved = SUM(itemsUsed * categoryCarbon)

Category averages (kg CO₂):
- Proteins: 5.0 kg
- Dairy: 2.5 kg
- Produce: 0.5 kg
- Grains: 1.0 kg
```

## Error Handling

### Error States
1. **Not Premium**
   - Show paywall immediately
   - No analytics access

2. **No Data Available**
   - Message: "Start tracking your pantry to see insights"
   - CTA: "Add items to pantry"

3. **Insufficient Data**
   - Message: "We need more data to show insights"
   - Suggestion: "Use DineN for at least 2 weeks"

4. **Network Error**
   - Show cached analytics (if available)
   - Banner: "Showing cached data from [date]"

5. **Load Failed**
   - Error message with retry button
   - Log error to backend

## Testing Requirements

### Backend Tests
- Analytics calculation accuracy
- Date range filtering
- Waste tracking logic
- Premium access validation
- Cache invalidation

### iOS Unit Tests
- Waste reduction rate calculation
- Money saved calculation
- Chart data formatting
- Insight generation logic

### iOS Integration Tests
- Full analytics flow
- Premium paywall display
- Period switching
- Action buttons (view recipes, etc.)
- Sharing functionality

### Manual Testing
- Test with various data volumes
- Test with no data
- Test edge cases (100% waste, 0% waste)
- Verify calculations accuracy
- Test all insight types
- Test sharing features

## Implementation Phases

### Phase 1: Backend (3-4 days)
1. Create usage_events and analytics_cache tables
2. Implement analytics calculation logic
3. Build GET /api/pantry/analytics endpoint
4. Build POST /api/pantry/items/{id}/mark-used endpoint
5. Implement waste tracking
6. Test calculations

### Phase 2: iOS Core (2-3 days)
1. Create analytics models
2. Build PantryAnalyticsManager
3. Build main PantryAnalyticsView
4. Implement period switching
5. Add premium gating

### Phase 3: Visualizations (2 days)
1. Build summary cards
2. Implement usage charts (bar/line)
3. Build insights list
4. Add waste history view
5. Add recommendations display

### Phase 4: Advanced Features (1-2 days)
1. Add monthly reports
2. Implement sharing functionality
3. Add gamification (badges, streaks)
4. Polish animations and transitions

### Phase 5: Testing & Polish (1 day)
1. Verify calculation accuracy
2. Test premium gating
3. Test all user flows
4. Performance optimization
5. Manual QA

## Analytics & Metrics

### Events to Track
```
analytics.viewed {
  userId, period, isPremium
}

analytics.periodChanged {
  userId, fromPeriod, toPeriod
}

analytics.insightActioned {
  userId, insightType, action
}

analytics.reportShared {
  userId, period, platform
}

analytics.paywallShown {
  userId
}

analytics.upgraded {
  userId, fromFeature: "analytics"
}
```

### KPIs
- % of premium users viewing analytics
- Average time spent in analytics
- Most common insight types
- Conversion rate (paywall → premium)
- Engagement rate (weekly active users)

## Dependencies

### Backend
- ❌ Need to implement usage tracking system
- ❌ Need analytics calculation engine
- ❌ Need caching layer for performance
- ✅ Premium subscription check (exists)
- ❌ Cost estimation data per category

### iOS
- ✅ PantryInventory (Phase 4.1 - must be complete)
- ✅ AuthManager (for premium check)
- ✅ SubscriptionView (for paywall)
- 🔄 Charts library (Swift Charts or third-party)

## Open Questions

1. Should we estimate costs automatically or ask users to input prices?
2. How accurate should carbon footprint calculations be?
3. Should we show community averages or personal trends only?
4. Do we need push notifications for weekly reports?
5. Should free users see a "teaser" of analytics (1 metric)?

## Success Criteria

### Launch Criteria
- ✅ Premium users can view analytics dashboard
- ✅ Waste reduction rate calculates correctly
- ✅ Insights are actionable and accurate
- ✅ Charts display usage trends
- ✅ Monthly reports are shareable
- ✅ Free users see paywall

### Quality Criteria
- Analytics load in < 3 seconds
- Calculations are accurate within 5% margin
- Insights are relevant and personalized
- UI is visually appealing and easy to understand
- Feature drives premium conversions

## Notes

- This is a key premium feature for retention
- Focus on actionable insights, not just data
- Gamification drives engagement
- Social sharing extends marketing reach
- Must be simple enough for non-data users
- Carbon footprint angle is strong for sustainability marketing
- Consider partnering with environmental organizations
