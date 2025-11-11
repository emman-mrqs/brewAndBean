# Order Preview Implementation Guide

## Overview
The Order Preview page displays all current orders (excluding completed and cancelled orders) with the ability to cancel orders that are in 'pending' or 'confirmed' status.

## Features Implemented

### 1. **Dynamic Order Loading**
- Fetches current orders from `/api/orders/current` endpoint
- Displays loading spinner while fetching data
- Shows empty state when no orders exist
- Error handling with retry button

### 2. **Order Display**
Each order card shows:
- **Order Header:**
  - Order ID with receipt icon
  - Order date and time
  - Order status badge (pending, confirmed, processing, ready, preparing)
  - Payment status badge (paid, pending payment, failed)

- **Order Information:**
  - Branch details (name, street, city)
  - Payment method (Cash on Pickup, GCash, PayPal, Card)
  - Order notes (if any)

- **Order Items:**
  - Product image with fallback to default
  - Product name and variant
  - Quantity and unit price
  - Total price per item

- **Order Total:**
  - Total amount in Philippine Peso (₱)

- **Cancel Button:**
  - Only shown for orders with status: 'pending' or 'confirmed'
  - Disabled for other statuses with informative message
  - Confirmation dialog before cancellation
  - Loading state during cancellation process

### 3. **Order Cancellation**
- Validates order status (only pending/confirmed can be cancelled)
- Restores product variant stock quantities
- Updates order status to 'cancelled'
- Uses database transactions for data integrity
- Auto-refreshes order list after successful cancellation

## Database Integration

### Tables Used:
1. **orders** - Main order data
2. **order_items** - Individual items in each order
3. **products** - Product information
4. **product_variant** - Product variants and stock
5. **branches** - Branch information

### Key SQL Features:
- **json_agg()** for aggregating order items into a nested JSON array
- **WHERE NOT IN** clause to filter out completed/cancelled orders
- **Transactions** for atomic stock restoration during cancellation
- **Joins** across multiple tables for complete order data

## API Endpoints

### GET `/api/orders/current`
Returns all active orders (not completed/cancelled) for the authenticated user.

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "order_status": "pending",
      "payment_status": "pending",
      "payment_method": "cash",
      "total_amount": "250.00",
      "notes": "Extra hot please",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "branch_name": "Main Branch",
      "branch_street": "123 Main St",
      "branch_city": "Manila",
      "branch_zipcode": "1000",
      "items": [
        {
          "product_name": "Cappuccino",
          "variant_name": "Medium",
          "quantity": 2,
          "unit_price": "125.00",
          "total_price": "250.00",
          "img_url": "/uploads/products/cappuccino.jpg"
        }
      ]
    }
  ]
}
```

### POST `/api/orders/:orderId/cancel`
Cancels an order if it's in 'pending' or 'confirmed' status.

**Request:**
- Path parameter: `orderId` (order ID to cancel)
- Requires authentication

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Order not found or already cancelled"
}
```

## Files Modified

### Backend:
1. **src/controller/user/orderController.js**
   - Added `getCurrentOrders()` method
   - Added `cancelOrder()` method
   - Updated `getOrderPreview()` to pass auth data

2. **src/routes/userRoutes.js**
   - Added route: `GET /api/orders/current`
   - Added route: `POST /api/orders/:orderId/cancel`

### Frontend:
1. **src/views/user/orderPreview.ejs**
   - Removed hardcoded order data
   - Added loading spinner
   - Added empty state
   - Added dynamic orders container

2. **src/public/js/user/orderPreview.js**
   - Complete rewrite for dynamic functionality
   - Added `loadCurrentOrders()` function
   - Added `createOrderCard()` function
   - Added `getStatusBadge()` function
   - Added `getPaymentBadge()` function
   - Added `formatPaymentMethod()` function
   - Added `confirmCancelOrder()` function

3. **src/public/css/orderPreview.css**
   - Added loading spinner styles
   - Added empty state styles
   - Added order card styles
   - Added order info grid styles
   - Added order items section styles
   - Added cancel button styles
   - Added responsive design for mobile

## Design Consistency

### Brand Colors:
- **Primary:** `#C67C4E` (Brew brown)
- **Primary Dark:** `#A56539`
- **Surface:** `#F9F2ED` (Light cream)
- **Success:** `#4CAF50` (Green)
- **Warning:** `#FF9800` (Orange)
- **Danger:** `#F44336` (Red)

### Status Badges:
- **Pending:** Warning (Orange)
- **Confirmed:** Info (Blue)
- **Processing:** Info (Blue) with spinning icon
- **Ready:** Success (Green)
- **Preparing:** Info (Blue)

### Payment Badges:
- **Paid/Completed:** Success (Green)
- **Pending:** Warning (Orange)
- **Failed:** Danger (Red)

## Responsive Design

### Desktop (> 768px):
- Full-width order cards
- Two-column info grid
- Side-by-side footer layout

### Tablet (768px):
- Stacked card header elements
- Single-column info grid
- Stacked footer layout

### Mobile (< 480px):
- Vertically stacked product items
- Centered product images
- Full-width cancel buttons
- Reduced font sizes

## User Experience Features

1. **Loading States:**
   - Spinner during initial load
   - "Cancelling..." text on cancel button

2. **Empty States:**
   - Icon and message when no orders exist
   - Link to browse menu

3. **Error Handling:**
   - Try-catch blocks for all async operations
   - User-friendly error messages
   - Retry button on load failure

4. **Confirmations:**
   - Alert before order cancellation
   - Success message after cancellation

5. **Visual Feedback:**
   - Hover effects on order cards
   - Button hover animations
   - Disabled state styling
   - Badge color coding

## Testing Checklist

- [ ] View page with no orders (empty state)
- [ ] View page with multiple orders
- [ ] View orders with different statuses
- [ ] Cancel a pending order
- [ ] Cancel a confirmed order
- [ ] Try to cancel a processing order (should show disabled message)
- [ ] Test on mobile devices (responsive design)
- [ ] Test with missing product images (fallback to default)
- [ ] Test with long order notes
- [ ] Test error handling (simulate network failure)

## Security Features

1. **Authentication Required:**
   - All endpoints require `requireAuth` middleware
   - User can only view/cancel their own orders

2. **Status Validation:**
   - Server-side validation prevents cancellation of non-cancellable orders
   - Stock restoration only happens for valid cancellations

3. **Database Transactions:**
   - Stock updates and order cancellations happen atomically
   - Rollback on any failure

## Future Enhancements

Potential improvements:
- Real-time order status updates (WebSocket)
- Order tracking with timeline
- Reorder functionality
- Print receipt option
- Email notifications on cancellation
- Partial cancellation (individual items)
- Cancellation reasons dropdown
- Estimated preparation time display
