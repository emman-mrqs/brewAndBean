# CRUD Operations Troubleshooting Guide

## 🔍 Problem: Can't Perform CRUD Operations on Products

### Root Cause Analysis

The admin product routes are protected by **JWT authentication**. All requests to `/admin/api/products` require:
1. Valid admin login session
2. `admin_token` cookie with valid JWT
3. Middleware: `requireAdmin` checks for this token

### ✅ Step-by-Step Fix

#### 1. **LOGIN AS ADMIN FIRST**
Before accessing the products page, you MUST be logged in as an admin.

**Admin Login Page:** `http://localhost:3000/admin/login`

If you don't have an admin account, you need to:
- Create an admin account in your database
- Or modify your existing admin login controller

#### 2. **Verify Admin Session**

Open browser DevTools (F12) → Application/Storage → Cookies → `http://localhost:3000`

**Check for:** `admin_token` cookie
- ✅ If present: You're logged in
- ❌ If missing: You need to login

#### 3. **Test CRUD Operations**

Once logged in as admin:

**Navigate to:** `http://localhost:3000/admin/products`

**Expected Console Logs:**
```
[ProductsController] getAllProducts called
[ProductsController] Found 2 products
```

**Browser Console (F12):**
```
Loading products...
✅ Products loaded: 2
```

### 🛠️ Common Issues & Solutions

#### Issue 1: 401 Unauthorized / Redirected to Home
**Symptom:** Can't access `/admin/products`, redirected to `/`

**Cause:** Not logged in as admin or `admin_token` expired

**Fix:**
1. Go to `http://localhost:3000/admin/login`
2. Login with admin credentials
3. Cookie will be set automatically
4. Try accessing products page again

#### Issue 2: Products Table Empty (No Data)
**Symptom:** Page loads but table is empty

**Cause:** JavaScript not loading or API call failing

**Fix:**
1. Open DevTools (F12) → Console tab
2. Look for errors:
   - `Failed to fetch` - Backend not running
   - `404 Not Found /js/admin/products.js` - File path wrong
   - `Unexpected token` - JavaScript syntax error

3. Check Network tab:
   - Look for request to `/admin/api/products`
   - Status should be `200 OK`
   - Response should have JSON with products array

#### Issue 3: Can't Add New Product
**Symptom:** Click "Add Product" button, nothing happens

**Possible Causes:**

**A. Modal not opening:**
```javascript
// Check console for errors
// products.js line ~234
```

**B. Form validation failing:**
- All fields required: Name, Price, Category, Stock, Description
- **IMAGE IS REQUIRED** for new products
- File must be JPEG/PNG/WebP/GIF
- Max size: 5MB

**C. Network error:**
- Check Network tab in DevTools
- POST to `/admin/api/products` should show
- Status `201 Created` = success
- Status `400 Bad Request` = validation error
- Status `500 Internal Server Error` = server error

#### Issue 4: Can't Edit Product
**Symptom:** Click edit button, nothing happens

**Check:**
1. Console for errors
2. Modal opens with existing data?
3. Submit sends PUT request to `/admin/api/products/:id`
4. Image is **optional** for updates (keeps old image if not provided)

#### Issue 5: Can't Delete Product
**Symptom:** Click delete, confirmation shows but delete fails

**Check:**
1. Network tab: DELETE request to `/admin/api/products/:id`
2. Response status should be `200 OK`
3. Console logs: `[ProductsController] Deleting product...`

### 🧪 Testing Guide

#### Test 1: GET Products
```bash
# You can't test this via curl without the cookie
# Must test in browser while logged in as admin
```

**In Browser Console (while logged in):**
```javascript
fetch('/admin/api/products')
  .then(r => r.json())
  .then(d => console.log('Products:', d))
  .catch(e => console.error('Error:', e));
```

Expected Output:
```json
{
  "success": true,
  "products": [
    {
      "id": "18",
      "img_url": "/uploads/products/...",
      "name": "Cold Barako",
      "price": "120.00",
      "description": "Bold. Strong...",
      "variant_name": "Iced Coffee",
      "stock_quantity": 50
    }
  ],
  "count": 2
}
```

#### Test 2: CREATE Product (via Form)

**Required Fields:**
- Name: "Test Product"
- Price: 99.99
- Category: "Hot Coffee" (variant_name)
- Stock: 10
- Description: "Test description"
- **Image:** MUST upload a file

**Expected Response:**
```json
{
  "success": true,
  "product": { ... },
  "message": "Product created successfully"
}
```

#### Test 3: UPDATE Product

Same as create, but:
- Image is **optional** (keeps existing if not provided)
- Any field can be updated individually

#### Test 4: DELETE Product

Click delete icon → Confirm → Product removed from table

### 📋 Debugging Checklist

Run through this checklist:

- [ ] Server running: `nodemon app.js`
- [ ] Database connected: Products exist in DB
- [ ] **Admin logged in:** Check for `admin_token` cookie
- [ ] Navigate to: `http://localhost:3000/admin/products`
- [ ] Page renders without errors
- [ ] Browser console shows: `[ProductsController] Found X products`
- [ ] Network tab shows: GET `/admin/api/products` returns 200
- [ ] Table displays products
- [ ] Click "Add Product" opens modal
- [ ] Fill all fields + **upload image**
- [ ] Submit shows success toast
- [ ] New product appears in table

### 🔧 Quick Fixes

#### If Nothing Works:

1. **Clear browser cache and cookies:**
   - Ctrl + Shift + Delete
   - Clear everything for localhost

2. **Restart server:**
   ```bash
   # Stop: Ctrl+C
   nodemon app.js
   ```

3. **Check database:**
   ```bash
   node -e "import('./src/database/db.js').then(m => m.default.query('SELECT COUNT(*) FROM products').then(r => console.log('Products:', r.rows[0].count)))"
   ```

4. **Re-login as admin:**
   - Go to `/admin/login`
   - Enter credentials
   - Check cookie set
   - Try products page again

### 📝 Admin Login Requirements

**Check if admin login route exists:**

File: `src/routes/adminAuthRoutes.js`

Should have:
```javascript
router.post('/admin/login', AdminLoginController.login);
```

**Admin login should:**
1. Verify credentials
2. Create JWT token
3. Set `admin_token` cookie (httpOnly, secure in production)
4. Redirect to `/admin/dashboard` or `/admin/products`

### 🚨 Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| `401 Unauthorized` | Not logged in | Login as admin |
| `403 Forbidden` | Logged in but not admin | Use admin account |
| `404 Not Found` | Route doesn't exist | Check adminRoutes.js |
| `500 Internal Server Error` | Backend crash | Check server console logs |
| `Validation failed` | Missing/invalid data | Fill all required fields |
| `Product image is required` | No image uploaded | Upload image file |
| `Failed to fetch` | Network error | Check server running |

### 💡 Pro Tips

1. **Always check browser console first** - errors show there
2. **Use Network tab** - see exact request/response
3. **Check server terminal** - backend errors show there
4. **Verify admin login** - most common issue
5. **Image is required for CREATE** - but optional for UPDATE
6. **Use descriptive category names** - e.g., "Hot Coffee", "Iced Coffee"

### 🎯 Final Checklist

If CRUD still doesn't work after all this:

1. Share screenshot of:
   - Browser console errors
   - Network tab showing failed request
   - Server terminal output
   - Application cookies

2. Verify:
   - You can access other admin pages (dashboard, users)?
   - Admin token exists in cookies?
   - Server shows no errors?

---

## Need Help?

Most issues are solved by:
1. ✅ Being logged in as admin
2. ✅ Uploading image when creating product
3. ✅ Filling all required fields
4. ✅ Checking browser console for errors
