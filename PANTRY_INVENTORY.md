# Pantry Inventory Feature Specification
## Smart Kitchen Inventory Management

## Overview
Pantry Inventory allows users to track what ingredients they have at home, monitor quantities, track expiration dates, and get low-stock alerts. This feature serves as the foundation for PantryPal and future smart shopping list features.

## User Stories

### Primary Use Cases
1. **As a busy parent**, I want to quickly check what I have before grocery shopping
2. **As a food waste reducer**, I want to track expiration dates to use ingredients before they spoil
3. **As a meal planner**, I want to see what ingredients I have available for cooking
4. **As a budget-conscious shopper**, I want to avoid buying duplicates of items I already have
5. **As an organized cook**, I want to categorize my pantry, fridge, and freezer items separately

## Feature Goals

### MVP Requirements
- CRUD operations for pantry items (Create, Read, Update, Delete)
- Categorization (produce, dairy, grains, proteins, spices, etc.)
- Quantity tracking with units
- Expiration date tracking
- Storage location (pantry, fridge, freezer)
- Search and filter functionality
- Low stock warnings

### Enhanced Features (v2)
- Barcode scanning for quick add
- Automatic quantity deduction when used in recipes
- Shopping list integration
- Inventory value tracking
- Sharing pantry with family members
- Recipe suggestions based on expiring items

## Technical Architecture

### Backend Endpoints

**Note:** These endpoints need to be implemented on the backend.

#### Get All Pantry Items
```
GET /api/pantry/items
Authorization: Bearer <firebase-token>

Query Parameters:
- category: string (optional) - Filter by category
- location: string (optional) - pantry | fridge | freezer
- expiringWithin: number (optional) - Days until expiration
- lowStock: boolean (optional) - Show only low stock items

Response:
{
  "items": [
    {
      "id": "item_abc123",
      "userId": "user_xyz",
      "name": "Chicken Breast",
      "category": "proteins",
      "quantity": 2,
      "unit": "lbs",
      "location": "freezer",
      "expirationDate": "2025-12-15",
      "lowStockThreshold": 1,
      "isLowStock": false,
      "notes": "Costco bulk pack",
      "addedDate": "2025-12-01",
      "lastUpdated": "2025-12-01"
    },
    {
      "id": "item_def456",
      "userId": "user_xyz",
      "name": "Milk",
      "category": "dairy",
      "quantity": 0.5,
      "unit": "gallons",
      "location": "fridge",
      "expirationDate": "2025-12-05",
      "lowStockThreshold": 0.5,
      "isLowStock": true,
      "notes": "2% fat",
      "addedDate": "2025-11-28",
      "lastUpdated": "2025-12-02"
    }
  ],
  "summary": {
    "totalItems": 47,
    "expiringWithin7Days": 5,
    "lowStockItems": 8,
    "categories": {
      "proteins": 6,
      "dairy": 5,
      "produce": 12,
      "grains": 8,
      "spices": 16
    }
  }
}
```

#### Add Pantry Item
```
POST /api/pantry/items
Authorization: Bearer <firebase-token>

Request Body:
{
  "name": "Chicken Breast",
  "category": "proteins",
  "quantity": 2,
  "unit": "lbs",
  "location": "freezer",
  "expirationDate": "2025-12-15",  // Optional
  "lowStockThreshold": 1,           // Optional
  "notes": "Costco bulk pack"       // Optional
}

Response:
{
  "item": { ... },  // Full item object
  "message": "Item added successfully"
}

Error Responses:
- 400: Missing required fields (name, quantity, unit)
- 400: Invalid category or location
```

#### Update Pantry Item
```
PUT /api/pantry/items/{itemId}
Authorization: Bearer <firebase-token>

Request Body:
{
  "quantity": 1.5,               // Optional
  "expirationDate": "2025-12-20", // Optional
  "notes": "Opened on 12/2"      // Optional
  // Any field can be updated
}

Response:
{
  "item": { ... },  // Updated item
  "message": "Item updated successfully"
}
```

#### Delete Pantry Item
```
DELETE /api/pantry/items/{itemId}
Authorization: Bearer <firebase-token>

Response:
{
  "message": "Item deleted successfully"
}
```

#### Bulk Update (Future)
```
POST /api/pantry/items/bulk-update
Request: Array of item updates
Use case: Recipe used 3 ingredients, deduct quantities
```

### Database Schema

```sql
CREATE TABLE pantry_items (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  location VARCHAR(50) NOT NULL,  -- pantry, fridge, freezer
  expiration_date DATE,
  low_stock_threshold DECIMAL(10,2),
  notes TEXT,
  added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_category (user_id, category),
  INDEX idx_expiration (expiration_date)
);
```

### iOS Implementation

#### File Structure
```
Views/
  Pantry/
    PantryView.swift                  ← NEW (main inventory list)
    PantryItemRow.swift               ← NEW (list item component)
    AddPantryItemView.swift           ← NEW (add/edit sheet)
    PantryFilterView.swift            ← NEW (filter sheet)
    ExpiringItemsView.swift           ← NEW (expiration alerts)
    LowStockView.swift                ← NEW (low stock items)

Models/
  PantryItem.swift                    ← NEW (item model)
  PantryCategory.swift                ← NEW (category enum)
  PantryLocation.swift                ← NEW (location enum)

Managers/
  PantryManager.swift                 ← NEW (API + local cache)
```

#### Key Components

**PantryItem.swift**
```swift
struct PantryItem: Identifiable, Codable {
    let id: String
    var name: String
    var category: PantryCategory
    var quantity: Double
    var unit: String
    var location: PantryLocation
    var expirationDate: Date?
    var lowStockThreshold: Double?
    var notes: String?
    var addedDate: Date
    var lastUpdated: Date

    var isLowStock: Bool {
        if let threshold = lowStockThreshold {
            return quantity <= threshold
        }
        return false
    }

    var isExpiringSoon: Bool {
        guard let expDate = expirationDate else { return false }
        let daysUntilExpiration = Calendar.current.dateComponents([.day], from: Date(), to: expDate).day ?? 0
        return daysUntilExpiration <= 7 && daysUntilExpiration >= 0
    }

    var isExpired: Bool {
        guard let expDate = expirationDate else { return false }
        return expDate < Date()
    }
}

enum PantryCategory: String, CaseIterable, Codable {
    case produce = "Produce"
    case dairy = "Dairy"
    case proteins = "Proteins"
    case grains = "Grains"
    case spices = "Spices"
    case condiments = "Condiments"
    case canned = "Canned Goods"
    case frozen = "Frozen"
    case beverages = "Beverages"
    case other = "Other"

    var icon: String {
        switch self {
        case .produce: return "🥬"
        case .dairy: return "🥛"
        case .proteins: return "🍗"
        case .grains: return "🌾"
        case .spices: return "🧂"
        case .condiments: return "🍯"
        case .canned: return "🥫"
        case .frozen: return "🧊"
        case .beverages: return "🧃"
        case .other: return "📦"
        }
    }
}

enum PantryLocation: String, CaseIterable, Codable {
    case pantry = "Pantry"
    case fridge = "Fridge"
    case freezer = "Freezer"

    var icon: String {
        switch self {
        case .pantry: return "🗄️"
        case .fridge: return "❄️"
        case .freezer: return "🧊"
        }
    }
}
```

**PantryManager.swift**
```swift
class PantryManager: ObservableObject {
    @Published var items: [PantryItem] = []
    @Published var isLoading = false
    @Published var error: Error?

    // Computed properties
    var expiringItems: [PantryItem] {
        items.filter { $0.isExpiringSoon || $0.isExpired }
            .sorted { $0.expirationDate ?? .distantFuture < $1.expirationDate ?? .distantFuture }
    }

    var lowStockItems: [PantryItem] {
        items.filter { $0.isLowStock }
    }

    func fetchItems() async throws {
        // GET /api/pantry/items
    }

    func addItem(_ item: PantryItem) async throws {
        // POST /api/pantry/items
    }

    func updateItem(_ item: PantryItem) async throws {
        // PUT /api/pantry/items/{id}
    }

    func deleteItem(_ item: PantryItem) async throws {
        // DELETE /api/pantry/items/{id}
    }

    func filterItems(
        category: PantryCategory?,
        location: PantryLocation?,
        expiringWithin: Int?,
        lowStockOnly: Bool
    ) -> [PantryItem] {
        // Local filtering logic
    }
}
```

**PantryView.swift**
```swift
struct PantryView: View {
    @StateObject private var pantryManager = PantryManager()
    @State private var showAddItem = false
    @State private var showFilters = false
    @State private var selectedCategory: PantryCategory?
    @State private var selectedLocation: PantryLocation?
    @State private var searchText = ""

    var filteredItems: [PantryItem] {
        var items = pantryManager.items

        if !searchText.isEmpty {
            items = items.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }

        if let category = selectedCategory {
            items = items.filter { $0.category == category }
        }

        if let location = selectedLocation {
            items = items.filter { $0.location == location }
        }

        return items
    }

    var body: some View {
        // Alert banners for expiring/low stock
        // Search bar
        // Filter chips
        // Grouped list by category or location
        // Add button
    }
}
```

## UI/UX Design

### Main Pantry View

Super Important!! Do not use Expires at language, lets only use when the item was purchased. This is for legal reasons. 

```
┌─────────────────────────────────┐
│      My Pantry          [+]     │
├─────────────────────────────────┤
│ ⚠️ 3 items expiring this week   │
│ ⚠️ 5 items running low          │
├─────────────────────────────────┤
│ 🔍 Search pantry...             │
│                                 │
│ Filters: [All] [Fridge] [Frozen]│
│                                 │
│ 🥬 PRODUCE (12 items)           │
│  ┌─────────────────────────┐   │
│  │ Tomatoes         3 lbs  │   │
│  │ Pantry      Pur.: 12/5 ⚠️│   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ Lettuce          1 head │   │
│  │ Fridge      Exp: 12/8   │   │
│  └─────────────────────────┘   │
│                                 │
│ 🥛 DAIRY (5 items)              │
│  ┌─────────────────────────┐   │
│  │ Milk          0.5 gal   │🔴│
│  │ Fridge      Exp: 12/5 ⚠️│   │
│  └─────────────────────────┘   │
│                                 │
│ 🍗 PROTEINS (6 items)           │
│  ┌─────────────────────────┐   │
│  │ Chicken Breast   2 lbs  │   │
│  │ Freezer     Exp: 12/15  │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

Legend:
- ⚠️ = Expiring within 7 days
- 🔴 = Low stock indicator

### Add/Edit Item Sheet

```
┌─────────────────────────────────┐
│  ✕  Add Pantry Item             │
├─────────────────────────────────┤
│                                 │
│  Item Name *                    │
│  ┌───────────────────────────┐ │
│  │ Chicken Breast            │ │
│  └───────────────────────────┘ │
│                                 │
│  Category *                     │
│  ┌───────────────────────────┐ │
│  │ 🍗 Proteins          ▼    │ │
│  └───────────────────────────┘ │
│                                 │
│  Quantity *          Unit *     │
│  ┌──────────┐  ┌────────────┐  │
│  │    2     │  │ lbs    ▼   │  │
│  └──────────┘  └────────────┘  │
│                                 │
│  Location *                     │
│  [ Pantry ] [ Fridge ] [Freezer]│
│                                 │
│  Expiration Date (optional)     │
│  ┌───────────────────────────┐ │
│  │ 12/15/2025           📅   │ │
│  └───────────────────────────┘ │
│                                 │
│  Low Stock Alert (optional)     │
│  ┌───────────────────────────┐ │
│  │ Alert when below: 1   lbs │ │
│  └───────────────────────────┘ │
│                                 │
│  Notes (optional)               │
│  ┌───────────────────────────┐ │
│  │ Costco bulk pack          │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │       Add Item            │ │
│  └───────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

### Expiring Items View

```
┌─────────────────────────────────┐
│  < Back  Expiring Soon          │
├─────────────────────────────────┤
│                                 │
│  ⏰ 3 items expiring this week   │
│                                 │
│  EXPIRED (1)                    │
│  ┌─────────────────────────┐   │
│  │ 🥛 Milk        0.5 gal  │   │
│  │ Exp: 12/1 (2 days ago)  │🗑️│
│  └─────────────────────────┘   │
│                                 │
│  EXPIRING IN 2 DAYS (2)         │
│  ┌─────────────────────────┐   │
│  │ 🥬 Tomatoes      3 lbs  │   │
│  │ Exp: 12/5               │   │
│  │ [Use in Recipe]         │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ 🧀 Cheddar      1 block │   │
│  │ Exp: 12/5               │   │
│  │ [Use in Recipe]         │   │
│  └─────────────────────────┘   │
│                                 │
│  💡 Tap "Use in Recipe" to find │
│     recipes using these items   │
│                                 │
└─────────────────────────────────┘
```

## User Flows

### Add Item Flow
1. User taps [+] button in PantryView
2. AddPantryItemView sheet appears
3. User enters:
   - Item name (required)
   - Category (required, dropdown)
   - Quantity + Unit (required)
   - Location (required, segmented control)
   - Expiration date (optional, date picker)
   - Low stock threshold (optional, number input)
   - Notes (optional, text field)
4. User taps "Add Item"
5. Item validates, sends POST request
6. On success:
   - Sheet dismisses
   - Item appears in list
   - Success haptic feedback
7. On error:
   - Show error message inline
   - Keep sheet open for retry

### Edit Item Flow
1. User taps item in PantryView
2. Item detail view appears (or sheet)
3. User taps "Edit" button
4. Fields become editable
5. User modifies quantity, date, notes, etc.
6. User taps "Save"
7. Sends PUT request
8. On success: Update UI, dismiss
9. On error: Show error, allow retry

### Delete Item Flow
1. User swipes left on item OR taps delete in edit view
2. Confirmation dialog appears: "Delete Chicken Breast?"
3. User confirms
4. Sends DELETE request
5. On success: Item removed from list with animation
6. On error: Show error, restore item

### Quick Quantity Update
1. User taps quantity number directly in list
2. Number picker appears inline or in sheet
3. User adjusts quantity
4. Auto-saves after 1 second debounce
5. Visual feedback of saving state

## Smart Features

### Expiration Alerts
- **Badge on tab icon**: Show count of expiring items
- **Alert banner**: At top of PantryView showing count
- **Push notifications** (future): "3 items expiring this week"
- **Recipe suggestions**: "Use in Recipe" button for expiring items → PantryPal

### Low Stock Alerts
- **Visual indicator**: Red dot on low stock items
- **Dedicated view**: "Low Stock" filter
- **Shopping list integration** (future): Auto-add to shopping list

### Categories & Organization
- **Group by category**: Collapsible sections
- **Group by location**: Pantry/Fridge/Freezer sections
- **Sort options**: Name, Expiration date, Quantity, Recently added

## Error Handling

### Error States
1. **Empty State**
   - Message: "Your pantry is empty"
   - CTA: "Add your first item"
   - Illustration: Empty pantry icon

2. **Network Error**
   - Show cached items (offline mode)
   - Banner: "Offline - showing cached data"
   - Retry button

3. **Load Failed**
   - Error message with retry button
   - Log error to backend

4. **Add/Update Failed**
   - Show inline error in form
   - Keep user data in form
   - Suggest checking connection

5. **Delete Failed**
   - Show alert with retry option
   - Restore item in list

## Backend Requirements

### Database Implementation
- Create `pantry_items` table
- Add foreign key to `users` table
- Add indexes for common queries
- Implement cascade delete (when user deleted)

### API Endpoints
All endpoints listed in "Backend Endpoints" section must be implemented:
- GET /api/pantry/items (with filters)
- POST /api/pantry/items
- PUT /api/pantry/items/{id}
- DELETE /api/pantry/items/{id}

### Validation
- Quantity must be > 0
- Unit must be non-empty
- Category must be valid enum
- Location must be valid enum
- Expiration date cannot be in distant past (>1 year)

## Testing Requirements

### Backend Tests
- CRUD operations for all endpoints
- Filter queries (category, location, expiring, low stock)
- Validation error handling
- User isolation (can't access other users' items)

### iOS Unit Tests
- PantryItem model calculations (isExpiringSoon, isLowStock)
- PantryManager filtering logic
- Search functionality
- Sort functionality

### iOS Integration Tests
- Full add → view → edit → delete flow
- Filter and search combinations
- Error handling scenarios
- Offline mode with cached data

### Manual Testing
- Add items in all categories
- Test expiration date calculations
- Test low stock indicators
- Test search and filters
- Test edit and delete
- Test with large inventory (50+ items)
- Test offline behavior

## Implementation Phases

### Phase 1: Backend API (2-3 days)
1. Create database table and schema
2. Implement all CRUD endpoints
3. Add validation middleware
4. Test all endpoints with Postman
5. Deploy to production

### Phase 2: iOS Core (2-3 days)
1. Create data models (PantryItem, Category, Location)
2. Implement PantryManager with API calls
3. Build PantryView with basic list
4. Implement AddPantryItemView
5. Test add/view flow

### Phase 3: Edit & Delete (1 day)
1. Implement edit functionality
2. Implement delete with confirmation
3. Add swipe actions
4. Test full CRUD flow

### Phase 4: Advanced Features (1-2 days)
1. Add search functionality
2. Implement category/location filters
3. Add expiring items view
4. Add low stock alerts
5. Implement grouping and sorting

### Phase 5: Polish (1 day)
1. Add empty states
2. Add loading states
3. Add error handling
4. Add offline mode
5. Manual QA testing

## Analytics & Metrics

### Events to Track
```
pantry.itemAdded {
  userId, category, location, hasExpirationDate
}

pantry.itemUpdated {
  userId, itemId, fieldsUpdated
}

pantry.itemDeleted {
  userId, category, reason
}

pantry.searched {
  userId, query
}

pantry.filtered {
  userId, filterType, filterValue
}

pantry.expiringItemsViewed {
  userId, expiringCount
}
```

### KPIs
- Average items per user
- Most common categories
- % of items with expiration dates
- % of items that expire vs get used
- Feature usage rate
- Time spent in pantry view

## Future Enhancements

### v2 Features
1. **Barcode scanning**: Scan product to auto-add
2. **Recipe integration**: Auto-deduct quantities when cooking
3. **Shopping list sync**: Auto-add low stock items
4. **Family sharing**: Share pantry with household
5. **Waste tracking**: Track expired items for insights
6. **Inventory value**: Show total $ value of pantry
7. **Smart suggestions**: "You bought milk 3 times this month"

### Integration Points
- **PantryPal**: Auto-populate ingredients from inventory
- **Meal Planning**: Check if user has ingredients
- **Shopping List**: Add missing ingredients
- **Recipes**: Show which recipes user can make now

## Success Criteria

### MVP Launch Criteria
- ✅ Users can add pantry items with all fields
- ✅ Users can view their pantry inventory
- ✅ Users can edit item quantities and dates
- ✅ Users can delete items
- ✅ Expiration warnings display correctly
- ✅ Low stock indicators work
- ✅ Search and filter work correctly

### Quality Criteria
- Pantry loads in < 2 seconds
- Add/edit operations feel instant
- No data loss on errors
- Offline mode works with cached data
- UI is intuitive and organized

## Notes

- This is a foundational feature that other features depend on
- Priority: Implement backend API first, then iOS
- Consider starting simple (no filters) then add complexity
- Expiration tracking is key differentiator
- Low stock alerts drive engagement
- This feature enables PantryPal and reduces manual ingredient entry
