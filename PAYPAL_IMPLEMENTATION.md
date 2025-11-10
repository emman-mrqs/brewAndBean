# PayPal Sandbox Integration - Bean & Brew

## Overview
This implementation integrates PayPal Sandbox payment processing into the checkout flow. The key feature is that **order data is NOT inserted into the database until PayPal payment is successfully completed**.

## Payment Flow

### 1. **Cash on Pickup Flow (Existing)**
```
User clicks "Place Order" → Redirects to Payment Page → Order created in DB → Payment processed
```

### 2. **PayPal Flow (New)**
```
User selects PayPal → Clicks PayPal Button → Order data saved in session (NOT in DB)
→ User redirects to PayPal → User approves payment on PayPal
→ Payment captured successfully → THEN order created in DB → Redirect to confirmation
```

## Key Implementation Details

### Database Tables Used
Based on the provided schema:
- **orders** - Main order record
- **order_items** - Individual items in the order
- **payments** - Payment transaction records
- **product_variant** - Stock management
- **cart** / **cart_items** - User cart (cleared after successful payment)

### Files Modified/Created

#### 1. **PayPal Configuration** (`src/config/paypal.js`)
- Sets up PayPal SDK client
- Configures Sandbox/Live environment based on `.env`
- Uses credentials: `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`

#### 2. **Payment Controller** (`src/controller/user/paymentController.js`)
Added new methods:

**`createPayPalOrder()`**
- Called when user clicks "Pay with PayPal"
- Stores order data in `req.session.pendingOrder` (NOT in database)
- Creates PayPal order via PayPal SDK
- Returns PayPal order ID to frontend

**`capturePayPalPayment()`**
- Called after user approves payment on PayPal
- Captures the payment via PayPal SDK
- **ONLY AFTER successful capture:**
  - Inserts order into `orders` table
  - Inserts items into `order_items` table
  - Inserts payment record into `payments` table
  - Decreases stock in `product_variant` table
  - Clears user's cart
- Returns order ID and transaction ID

**`paypalSuccess()` / `paypalCancel()`**
- Callback handlers for PayPal redirect URLs
- Success: redirects to order confirmation
- Cancel: redirects back to checkout with error message

#### 3. **Routes** (`src/routes/userRoutes.js`)
Added new routes:
```javascript
POST /api/paypal/create-order     // Create PayPal order
POST /api/paypal/capture-payment  // Capture payment after approval
GET  /api/paypal/success          // Success callback
GET  /api/paypal/cancel           // Cancel callback
```

#### 4. **Checkout View** (`src/views/user/checkout.ejs`)
- Added payment method selection UI (Cash on Pickup vs PayPal)
- Integrated PayPal JavaScript SDK
- Added PayPal button container
- Added modern CSS styling for payment options

#### 5. **Checkout JavaScript** (`src/public/js/user/checkout.js`)
Added functionality:

**Payment Method Selection**
- Toggles between Cash on Pickup and PayPal
- Shows/hides appropriate buttons

**PayPal Button Integration**
- `initPayPalButton()` - Initializes PayPal button
- `createOrder` callback - Validates form, calls backend to create PayPal order
- `onApprove` callback - Captures payment after user approval
- `onError` / `onCancel` - Error handling

## Environment Variables

Add to `.env`:
```properties
# PayPal Sandbox REST API
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_CLIENT_SECRET=your_client_secret_here
PAYPAL_MODE=sandbox

# App URL for PayPal callbacks
APP_URL=http://localhost:3000
```

## Testing with PayPal Sandbox

### 1. **Get Sandbox Credentials**
- Go to https://developer.paypal.com
- Login to your developer account
- Navigate to: Apps & Credentials → Sandbox
- Copy Client ID and Secret

### 2. **Test Buyer Account**
- PayPal provides test buyer accounts
- Or create one in: Sandbox → Accounts
- Use test account to complete payments

### 3. **Test Payment Flow**
1. Add items to cart
2. Go to checkout
3. Fill in contact information
4. Select branch
5. Click on "PayPal" payment method
6. Click the PayPal button
7. Login with sandbox buyer account
8. Approve payment
9. Verify order is created in database
10. Check order confirmation page

## Currency
- Currently set to **PHP (Philippine Peso)**
- Can be changed in `createPayPalOrder()` method

## Error Handling

### Frontend
- Form validation before PayPal popup
- Toast notifications for errors
- Graceful handling of cancelled payments

### Backend
- Database transaction rollback on errors
- Stock validation before order creation
- PayPal API error handling
- Session cleanup on failure

## Security Features

1. **Authentication Required** - All PayPal routes require user authentication
2. **Verification Required** - User must be verified to checkout
3. **Session-based Storage** - Pending orders stored in secure sessions
4. **Transaction Rollback** - Database changes rolled back on errors
5. **Stock Validation** - Prevents overselling
6. **HTTPS Required** - For production PayPal integration

## Production Deployment

### Changes Required:
1. Update `.env`:
   ```
   PAYPAL_MODE=live
   APP_URL=https://yourdomain.com
   ```
2. Use Live API credentials (not Sandbox)
3. Update return URLs to production domain
4. Enable HTTPS
5. Test thoroughly with small amounts first

## Advantages of This Implementation

✅ **No Database Pollution** - Failed payments don't create orphan orders
✅ **Atomic Transactions** - Order only created if payment succeeds
✅ **Inventory Protection** - Stock only reduced on successful payment
✅ **User-Friendly** - Clear payment method selection
✅ **Modern UI** - Responsive design with smooth animations
✅ **Error Recovery** - Easy to retry failed payments
✅ **Session Management** - Proper cleanup of pending orders

## Common Issues & Solutions

### Issue: PayPal button not showing
**Solution:** Check browser console for JavaScript errors, verify PayPal SDK is loaded

### Issue: Payment succeeds but order not created
**Solution:** Check server logs, verify database connection, check stock availability

### Issue: "No pending order found" error
**Solution:** Session may have expired, user needs to start checkout again

### Issue: Currency mismatch
**Solution:** Ensure currency code matches your PayPal account settings

## Database Schema Reference

```sql
-- Orders table
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    notes TEXT,
    payment_method VARCHAR,
    payment_status VARCHAR,
    total_amount DECIMAL,
    shipping_address TEXT,
    branch_id BIGINT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Order Items table
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id),
    product_variant_id BIGINT,
    quantity BIGINT,
    unit_price DECIMAL,
    total_price DECIMAL
);

-- Payments table
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id),
    payment_method VARCHAR,
    payment_status VARCHAR,
    transaction_id VARCHAR,
    amount_paid DECIMAL,
    payment_date TIMESTAMP
);
```

## Support
For PayPal integration issues:
- PayPal Developer Docs: https://developer.paypal.com/docs/
- PayPal Sandbox Testing: https://developer.paypal.com/tools/sandbox/

---
**Implementation Date:** November 10, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready (Sandbox Mode)
