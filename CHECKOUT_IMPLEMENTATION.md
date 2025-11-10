# Checkout System Implementation Summary

## Files Created/Modified

### 1. SQL Tables (create_orders_tables.sql)
Created three new tables for the order management system:

#### **orders table**
- `id` - Primary key (BIGSERIAL)
- `user_id` - Foreign key to users table
- `notes` - Order notes/instructions
- `payment_method` - Payment method chosen
- `payment_status` - Status: pending, completed, failed
- `total_amount` - Total order amount
- `shipping_address` - Customer contact info (name, email, phone)
- `branch_id` - Foreign key to branches table (pickup location)
- `created_at` - Timestamp
- `updated_at` - Auto-updated timestamp

#### **order_items table**
- `id` - Primary key (BIGSERIAL)
- `order_id` - Foreign key to orders
- `product_variant_id` - Product being ordered
- `quantity` - Number of items
- `unit_price` - Price per item
- `total_price` - quantity × unit_price

#### **payments table**
- `id` - Primary key (BIGSERIAL)
- `order_id` - Foreign key to orders
- `payment_method` - Payment type (gcash, card, cod)
- `payment_status` - pending, completed, failed
- `transaction_id` - External payment reference
- `amount_paid` - Amount paid
- `payment_date` - Timestamp

**Features:**
- Auto-increment IDs
- Foreign key relationships with CASCADE
- Indexes for performance
- Trigger for auto-updating `updated_at`

---

### 2. Frontend JavaScript (checkout.js)

**Location:** `src/public/js/user/checkout.js`

**Key Functions:**

#### Initialization
- `loadBranches()` - Fetches all branches from API
- `renderBranchOptions()` - Populates branch dropdown
- `renderOrderSummary()` - Displays cart items in order summary

#### Cart Management
- `loadCart()` - Gets selected items from localStorage
- `loadPromo()` - Gets promo code data
- Calculates: subtotal, tax (8%), discount, total
- **Shipping: ₱0.00** (pickup orders)

#### Branch Selection
- `handleBranchSelection()` - Shows selected branch details
- Displays: branch name, full address

#### Order Submission
- `validateForm()` - Validates all required fields
  - Full name
  - Email (with regex validation)
  - Phone number
  - Branch selection
- `handlePlaceOrder()` - Submits order to API
  - Sends order data to `/api/orders`
  - Clears cart on success
  - Redirects to payment page with orderId

#### Utility Functions
- `escapeHtml()` - Prevents XSS attacks
- `showNotification()` - User feedback

---

### 3. Backend Controller (orderController.js)

**Location:** `src/controller/user/orderController.js`

**API Methods:**

#### `createOrder(req, res)`
- **POST** `/api/orders`
- Creates order with transaction
- Validates required fields
- Inserts order record
- Inserts all order items
- Returns orderId for payment

#### `getOrder(req, res)`
- **GET** `/api/orders/:orderId`
- Fetches single order with branch details
- Includes all order items
- Returns complete order object

#### `getUserOrders(req, res)`
- **GET** `/api/orders`
- Gets all orders for authenticated user
- Includes branch info and item count
- Ordered by date (newest first)

#### `updateOrderStatus(req, res)`
- **PUT** `/api/orders/:orderId/status`
- Updates payment status and method
- Returns updated order

**Page Rendering Methods:**
- `getCheckout()` - Renders checkout page
- `getOrderHistory()` - Renders order history
- `getOrderPreview()` - Renders order preview

---

### 4. Routes (userRoutes.js)

**New API Routes Added:**

```javascript
// Order API routes
POST   /api/orders                    - Create new order
GET    /api/orders/:orderId           - Get order by ID
GET    /api/orders                    - Get user's orders
PUT    /api/orders/:orderId/status    - Update order status
```

**Protected with:**
- `requireAuth` - Must be logged in
- `requireVerification` - Email must be verified
- `checkSuspension` - Account not suspended

---

### 5. Checkout Page (checkout.ejs)

**Changes Made:**

#### Progress Header (4 steps)
1. ✅ Cart (completed)
2. ✅ Checkout (active)
3. 🔄 **Payment** (NEW - moved here)
4. ⏳ Complete

#### Form Sections

**Contact Information**
- Full Name
- Email
- Phone Number

**Choose Pickup Branch** (REPLACED Delivery Address)
- Branch dropdown (loads from API)
- Shows: Branch Name - City
- Branch info card displays:
  - Branch name
  - Full address (street, city, zipcode)
- Pickup notes (optional)

**Removed:**
- ❌ Street Address field
- ❌ City field
- ❌ ZIP Code field
- ❌ Payment Method section (moved to separate Payment page)
- ❌ Card details form

#### Order Summary (Right Panel)
- Order items from cart
- Subtotal
- Shipping: ₱0.00 (pickup)
- Tax: 8%
- Discount (if promo applied)
- **Total**
- "Place Order Securely" button

---

## Workflow

### User Journey:
1. **Cart** → User adds items to cart
2. **Checkout** → User fills contact info and selects branch
3. **Place Order** → Order created in database
4. **Payment** → Redirect to payment page with orderId
5. **Complete** → Order confirmed

### Data Flow:

```
1. User clicks "Place Order Securely"
   ↓
2. checkout.js validates form
   ↓
3. POST to /api/orders with:
   - Customer info (name, email, phone)
   - Branch ID
   - Cart items
   - Totals (subtotal, tax, total)
   ↓
4. orderController.createOrder()
   - BEGIN transaction
   - INSERT into orders table
   - INSERT into order_items table (all items)
   - COMMIT transaction
   - Return orderId
   ↓
5. Clear localStorage (cart, promo)
   ↓
6. Redirect to /payment?orderId=123
```

---

## Key Features

### Security
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (HTML escaping)
- ✅ Authentication required
- ✅ Email verification required
- ✅ Transaction handling (ROLLBACK on error)

### User Experience
- ✅ Real-time branch selection
- ✅ Order summary updates
- ✅ Form validation with clear error messages
- ✅ Loading states during submission
- ✅ Success notifications
- ✅ Responsive design

### Data Integrity
- ✅ Foreign key constraints
- ✅ Database transactions
- ✅ Required field validation
- ✅ Auto-timestamps
- ✅ Cascading deletes

---

## Testing Checklist

- [ ] Run `create_orders_tables.sql` in PostgreSQL
- [ ] Test branch loading in checkout
- [ ] Test order creation with valid data
- [ ] Test form validation (empty fields)
- [ ] Test email format validation
- [ ] Test cart item display
- [ ] Test total calculations
- [ ] Test order storage in database
- [ ] Test redirect to payment page
- [ ] Test cart clearing after order

---

## Next Steps

1. **Payment Page Implementation**
   - Create payment.ejs
   - Implement payment methods (GCash, Card, COD)
   - Update payment status after successful payment
   - Create payment records in payments table

2. **Order History**
   - Display user's past orders
   - Show order status
   - Allow order tracking

3. **Admin Order Management**
   - View all orders
   - Update order status
   - Manage fulfillment

---

## Environment Requirements

- Node.js with ES6 modules
- PostgreSQL database
- Express.js server
- EJS templating
- localStorage support in browser

---

## Database Relationships

```
users (1) ─── (N) orders (1) ─── (N) order_items
                     │
                     └─── (1) branches
                     │
                     └─── (1) payments
```

---

## API Response Examples

### Success - Create Order
```json
{
  "success": true,
  "message": "Order created successfully",
  "orderId": 123
}
```

### Error - Missing Fields
```json
{
  "success": false,
  "message": "Missing required fields"
}
```

### Success - Get Order
```json
{
  "success": true,
  "order": {
    "id": 123,
    "user_id": 1,
    "total_amount": "450.00",
    "payment_status": "pending",
    "branch_name": "Manila Downtown",
    "branch_city": "Manila",
    "items": [...]
  }
}
```

---

## Notes

- Shipping is set to ₱0.00 for all orders (pickup only)
- Tax rate is 8% of subtotal
- Payment is handled on a separate page after order creation
- Cart is cleared only after successful order creation
- Orders are linked to branches for pickup location tracking

