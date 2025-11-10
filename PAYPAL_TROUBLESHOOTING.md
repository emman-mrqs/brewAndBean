# PayPal Integration Troubleshooting Guide

## Current Issue: "Cannot read properties of undefined (reading 'startsWith')"

This is an **internal PayPal SDK error** that can occur due to several reasons:

### ✅ Quick Fixes to Try

#### 1. **Verify PayPal Sandbox Credentials**
Your current credentials in `.env`:
```

**Action:**
1. Go to https://developer.paypal.com/dashboard/
2. Login to your developer account
3. Go to **Apps & Credentials**
4. Select **Sandbox** tab
5. Check if your app is still active
6. Try creating a **NEW** sandbox app and get fresh credentials

#### 2. **Browser Issues**
- **Clear browser cache** (Ctrl + Shift + Delete)
- **Disable browser extensions** (especially ad blockers)
- **Try Incognito/Private mode**
- **Try a different browser** (Chrome, Firefox, Edge)

#### 3. **Account Configuration**
The error can occur if your PayPal sandbox account isn't fully configured:

1. Go to https://developer.paypal.com
2. Navigate to **Sandbox → Accounts**
3. Make sure you have at least:
   - 1 **Business** account (merchant)
   - 1 **Personal** account (buyer)
4. Click on each account and verify they're active

#### 4. **Create a Fresh Sandbox App**

Steps:
1. Go to https://developer.paypal.com/dashboard/
2. Click **Apps & Credentials**
3. Click **Create App**
4. Enter app name: `Bean-and-Brew-Sandbox`
5. Select sandbox business account
6. Click **Create App**
7. Copy the new **Client ID** and **Secret**
8. Update `.env` file with new credentials

---

## Alternative Solution: Use PayPal's Hosted Button

If the SDK continues to have issues, you can use PayPal's hosted button approach instead:

### Option A: PayPal Smart Payment Buttons (Current approach)
- More control
- Better UX
- Requires SDK to work properly

### Option B: PayPal Standard Checkout (Fallback)
- More reliable
- Redirects to PayPal website
- Doesn't require SDK

---

## Testing the Current Implementation

### Check Console Output:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these messages:
   ```
   PayPal Client ID loaded: ✓ Available
   Client ID length: 80
   PayPal SDK loaded successfully
   Checking PayPal availability (attempt 1)...
   PayPal Buttons is ready!
   ```

### If you see errors:
- ❌ "PayPal Client ID loaded: ✗ Missing" → Controller not passing client ID
- ❌ "Cannot read properties of undefined" → PayPal SDK internal error
- ❌ "Failed to load PayPal SDK" → Network or blocking issue

---

## Recommended Actions (In Order)

### 🔴 Critical (Do First):
1. ✅ Create a **brand new** PayPal sandbox app
2. ✅ Get fresh Client ID and Secret
3. ✅ Update `.env` file
4. ✅ Restart your server
5. ✅ Test in incognito mode

### 🟡 If Still Not Working:
1. Check PayPal Developer Dashboard for account status
2. Verify sandbox business account is active
3. Try different browser
4. Check internet connection/firewall

### 🟢 Alternative Approach:
If nothing works, we can implement a simpler PayPal integration using:
- PayPal REST API direct approach
- PayPal hosted checkout page
- Third-party payment aggregator (Paymongo, etc.)

---

## Current Implementation Status

✅ **Working:**
- Payment page loads
- Order data retrieved from localStorage
- Cash on Pickup works
- Payment method selection works

❌ **Not Working:**
- PayPal SDK initialization
- PayPal Buttons rendering

---

## Quick Test Script

Add this to your browser console to test PayPal SDK manually:

```javascript
// Check if PayPal is loaded
console.log('PayPal available?', typeof paypal !== 'undefined');
console.log('PayPal.Buttons available?', typeof paypal?.Buttons === 'function');

// Try to create a simple button
if (typeof paypal !== 'undefined' && typeof paypal.Buttons === 'function') {
    console.log('✅ PayPal is ready!');
} else {
    console.log('❌ PayPal not ready');
}
```

---

## Contact PayPal Support

If the issue persists, it might be an issue with your PayPal developer account:

**PayPal Developer Support:**
- Forum: https://www.paypal-community.com/
- Email: DL-PayPal-Partner-Support@paypal.com
- Developer Support: https://developer.paypal.com/support/

**What to tell them:**
> "I'm getting a 'Cannot read properties of undefined (reading startsWith)' error when trying to load the PayPal JavaScript SDK in sandbox mode. My Client ID is [YOUR_CLIENT_ID]. The error occurs in the SDK itself, not in my code."

---

## Temporary Workaround

For now, users can still complete orders using **Cash on Pickup**. PayPal can be enabled later once the SDK issue is resolved.

To disable PayPal temporarily:
1. Comment out the PayPal option in `paymentCheckout.ejs`
2. Remove PayPal routes (optional)
3. Users will only see "Cash on Pickup" option

---

## Next Steps

1. **Verify**: Check PayPal developer dashboard
2. **Test**: Create new app with fresh credentials
3. **Debug**: Use console logs to track SDK loading
4. **Fallback**: Enable Cash on Pickup only if needed

Last Updated: November 10, 2025
