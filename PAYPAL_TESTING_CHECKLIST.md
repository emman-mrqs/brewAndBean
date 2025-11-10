# PayPal Integration Testing Checklist

## Pre-Testing Setup
- [ ] Verify `.env` has correct PayPal credentials
- [ ] Verify `PAYPAL_MODE=sandbox`
- [ ] Verify `APP_URL=http://localhost:3000`
- [ ] Server is running on port 3000
- [ ] Database is connected and running
- [ ] User account is created and verified

## Test Case 1: Payment Method Selection UI
- [ ] Navigate to checkout page
- [ ] Verify "Cash on Pickup" and "PayPal" buttons are visible
- [ ] Click "PayPal" button - should highlight and show PayPal button
- [ ] Click "Cash on Pickup" - should highlight and hide PayPal button
- [ ] Verify smooth transitions and styling

## Test Case 2: Form Validation
- [ ] Select PayPal payment method
- [ ] Click PayPal button without filling form
- [ ] Should show validation errors for required fields
- [ ] Fill in name, email, phone
- [ ] Don't select branch - should show error
- [ ] Select branch - validation should pass

## Test Case 3: Successful PayPal Payment
- [ ] Add items to cart
- [ ] Navigate to checkout
- [ ] Fill in all required fields
- [ ] Select a branch
- [ ] Click "PayPal" payment method
- [ ] Click the PayPal button
- [ ] Should redirect to PayPal sandbox login
- [ ] Login with PayPal sandbox buyer account
  - Email: (your sandbox buyer email)
  - Password: (your sandbox password)
- [ ] Approve the payment on PayPal
- [ ] Should redirect back to your site
- [ ] Verify success toast notification
- [ ] Should redirect to order confirmation page
- [ ] **Check database:**
  - [ ] Order exists in `orders` table
  - [ ] Order items exist in `order_items` table
  - [ ] Payment record exists in `payments` table with status 'completed'
  - [ ] Product stock decreased in `product_variant` table
  - [ ] User cart is cleared in `cart_items` table

## Test Case 4: Cancelled PayPal Payment
- [ ] Add items to cart
- [ ] Go through checkout process
- [ ] Click PayPal button
- [ ] On PayPal page, click "Cancel and return"
- [ ] Should redirect back to checkout
- [ ] Verify warning toast: "Payment cancelled"
- [ ] **Check database:**
  - [ ] No order should be created
  - [ ] Cart should still have items
  - [ ] No payment record created

## Test Case 5: PayPal Payment Error
- [ ] Try payment with insufficient funds (if possible in sandbox)
- [ ] Should show error toast
- [ ] **Check database:**
  - [ ] No order created
  - [ ] No payment record
  - [ ] Stock unchanged

## Test Case 6: Session Handling
- [ ] Start checkout with PayPal
- [ ] Open PayPal popup
- [ ] Wait for session to expire (if timeout is short)
- [ ] Try to complete payment
- [ ] Should handle gracefully with appropriate error

## Test Case 7: Stock Validation
- [ ] Find a product with low stock (e.g., 1 item)
- [ ] Add 1 item to cart
- [ ] Complete checkout with PayPal
- [ ] **Check database:**
  - [ ] Stock should be 0
- [ ] Try to order same item again
- [ ] Should show "Insufficient stock" error

## Test Case 8: Multiple Items Order
- [ ] Add 3-5 different items to cart
- [ ] Complete checkout with PayPal
- [ ] **Check database:**
  - [ ] All items in `order_items` table
  - [ ] Correct quantities
  - [ ] Correct prices
  - [ ] Total matches sum of items + tax

## Test Case 9: Cash on Pickup (Verify still works)
- [ ] Add items to cart
- [ ] Select "Cash on Pickup" payment method
- [ ] Click "Place Order"
- [ ] Should redirect to payment page
- [ ] Complete payment flow
- [ ] Verify order created successfully

## Test Case 10: Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] Verify toast appears in bottom right
- [ ] Verify payment buttons are responsive
- [ ] Verify PayPal button renders correctly on all sizes

## Database Verification Queries

### Check if order was created:
```sql
SELECT * FROM orders 
WHERE payment_method = 'paypal' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Check order items:
```sql
SELECT oi.*, pv.name as variant_name, p.name as product_name
FROM order_items oi
JOIN product_variant pv ON oi.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
WHERE oi.order_id = [ORDER_ID];
```

### Check payment record:
```sql
SELECT * FROM payments 
WHERE order_id = [ORDER_ID];
```

### Check stock changes:
```sql
SELECT id, name, stock_quantity 
FROM product_variant 
WHERE id IN (SELECT product_variant_id FROM order_items WHERE order_id = [ORDER_ID]);
```

### Check if cart was cleared:
```sql
SELECT ci.* FROM cart_items ci
JOIN cart c ON ci.cart_id = c.id
WHERE c.user_id = [USER_ID];
-- Should return 0 rows after successful payment
```

## Console Checks

### Browser Console (F12)
- [ ] No JavaScript errors
- [ ] PayPal SDK loaded message
- [ ] "Checkout page initialized" message
- [ ] Successful API calls to `/api/paypal/create-order`
- [ ] Successful API calls to `/api/paypal/capture-payment`

### Server Console
- [ ] No server errors
- [ ] PayPal order creation logs
- [ ] Payment capture logs
- [ ] Database transaction logs
- [ ] Stock update logs

## Edge Cases to Test
- [ ] Empty cart + PayPal payment
- [ ] Invalid branch selection
- [ ] Special characters in notes field
- [ ] Very long product names
- [ ] Decimal quantities (should be prevented)
- [ ] Negative prices (should be impossible)
- [ ] Network interruption during payment
- [ ] Browser back button after PayPal redirect

## Performance Checks
- [ ] PayPal button loads within 2 seconds
- [ ] Order creation < 1 second
- [ ] Payment capture < 3 seconds
- [ ] No memory leaks in browser
- [ ] Database queries optimized

## Security Checks
- [ ] Cannot access PayPal routes without authentication
- [ ] Cannot capture payment without valid order ID
- [ ] Session data is secure
- [ ] No sensitive data in URL parameters
- [ ] No SQL injection vulnerabilities
- [ ] CSRF protection active

## Expected Results Summary

### ✅ Success Indicators:
- Toast appears bottom-right with "Payment successful!"
- Redirects to order confirmation
- Order in database with status 'completed'
- Payment record with transaction ID
- Stock properly decreased
- Cart cleared

### ❌ Failure Indicators:
- Error toast appears
- No order in database
- Stock unchanged
- Cart still has items
- User redirected to checkout with error

## Notes Section
```
Test Date: ________________
Tester: ___________________
Browser: __________________
Issues Found: 
_________________________________
_________________________________
_________________________________

All Tests Passed: [ ] YES [ ] NO
Ready for Production: [ ] YES [ ] NO
```

## Troubleshooting Common Issues

### Issue: PayPal button not appearing
**Check:**
- Browser console for JavaScript errors
- PayPal SDK loaded (check Network tab)
- Element `#paypal-button-container` exists
- Client ID in .env is correct

### Issue: "No pending order found"
**Solution:**
- Session expired - restart checkout process
- Clear cookies and try again

### Issue: Payment succeeds but order not created
**Check:**
- Server console for errors
- Database connection
- Stock availability
- Transaction logs

### Issue: Stuck on PayPal page
**Check:**
- Return URL is accessible
- Server is running
- Network connectivity
