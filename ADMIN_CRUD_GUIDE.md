# 🔑 HOW TO ACCESS ADMIN PANEL & PERFORM CRUD

## ⚡ QUICK START (3 STEPS)

### Step 1: Start the Server
```bash
nodemon app.js
```

### Step 2: Login as Admin
**Admin Login URL:**
```
http://localhost:3000/admin/login/3pDcYhOa8yGulaoB6dhat95FPsSeQQ
```

**Admin Credentials:**
- Email: Check your `.env` file for `ADMIN_EMAIL`
- Password: Check your `.env` file for `ADMIN_PASSWORD`

### Step 3: Access Products Page
After logging in, navigate to:
```
http://localhost:3000/admin/products
```

---

## 🎯 Why CRUD Wasn't Working

### The Problem
Your admin routes are protected by **JWT authentication**. Without logging in first:
- ❌ API calls return 401 Unauthorized
- ❌ You get redirected to home page
- ❌ CRUD operations fail silently

### The Solution
1. ✅ Login at the secret admin URL (with token in path)
2. ✅ System sets `admin_token` cookie
3. ✅ Now all CRUD operations work

---

## 📋 Complete CRUD Testing Guide

### 1️⃣ CREATE (Add New Product)

**Click:** "Add New Product" button

**Fill Required Fields:**
- **Product Name:** e.g., "Caramel Macchiato"
- **Price:** e.g., 150.00
- **Category:** e.g., "Hot Coffee"
- **Stock Quantity:** e.g., 25
- **Description:** e.g., "Rich espresso with vanilla and caramel"
- **Image:** **REQUIRED** - Upload JPEG/PNG/WebP/GIF (max 5MB)

**Click:** "Save Product"

**Expected Result:**
- ✅ Success toast appears
- ✅ New product appears in table
- ✅ Console shows: `Product created successfully`

**Common Errors:**
- ❌ "Product image is required" → Upload an image file
- ❌ "Validation failed" → Check all fields filled
- ❌ "Invalid file type" → Use JPEG/PNG/WebP/GIF only

---

### 2️⃣ READ (View Products)

**Automatic on Page Load**

**Expected Result:**
- ✅ Table shows all products
- ✅ Console shows: `[ProductsController] Found X products`
- ✅ Pagination works if >10 products

**If Table is Empty:**
1. Open DevTools (F12) → Console
2. Check for errors
3. Check Network tab: GET `/admin/api/products` should return 200
4. Verify you're logged in (check for `admin_token` cookie)

---

### 3️⃣ UPDATE (Edit Product)

**Click:** Edit icon (pencil) on any product row

**Modal Opens with Existing Data**

**Modify Any Fields:**
- Change price, stock, description, etc.
- Upload new image (optional - keeps old if not provided)
- Update category

**Click:** "Save Changes"

**Expected Result:**
- ✅ Success toast appears
- ✅ Table updates with new data
- ✅ Console shows: `Product updated successfully`

**Common Errors:**
- ❌ Nothing happens → Check console for JavaScript errors
- ❌ "Product not found" → Product may have been deleted
- ❌ Modal doesn't close → Check for validation errors

---

### 4️⃣ DELETE (Remove Product)

**Click:** Delete icon (trash) on any product row

**Confirmation Modal Appears**

**Click:** "Delete" to confirm

**Expected Result:**
- ✅ Success toast appears
- ✅ Product removed from table
- ✅ Image file deleted from server
- ✅ Database records removed (product + variants)

**Common Errors:**
- ❌ "Product not found" → Already deleted
- ❌ Delete fails → Check server console for errors

---

## 🔍 Debugging Tools

### Browser Console (F12)
Check for these messages:
```javascript
// Success messages
"[ProductsController] getAllProducts called"
"[ProductsController] Found 2 products"
"Product created successfully"
"Product updated successfully"

// Error messages
"Failed to fetch" // Backend not running
"401 Unauthorized" // Not logged in
"Validation failed" // Missing fields
```

### Network Tab (F12 → Network)
Monitor API calls:
```
GET  /admin/api/products          → 200 OK (list products)
POST /admin/api/products          → 201 Created (new product)
PUT  /admin/api/products/:id      → 200 OK (update)
DELETE /admin/api/products/:id    → 200 OK (delete)
```

### Server Console
Watch for backend logs:
```
[ProductsController] getAllProducts called
[ProductsController] Found 2 products
[ProductsController] createProduct called
[ProductsController] Body: { name: '...', price: '...' }
[ProductsController] File: Uploaded
[ProductsController] Image path: /uploads/products/...
```

---

## 🚨 Common Issues & Fixes

### Issue: Can't Access Admin Panel
**Symptom:** Redirected to home page

**Fix:**
1. Use the correct admin login URL with token:
   ```
   http://localhost:3000/admin/login/3pDcYhOa8yGulaoB6dhat95FPsSeQQ
   ```
2. Don't use `/admin/login` without the token
3. Token must match `ADMIN_LOGIN_TOKEN` in `.env`

---

### Issue: Products Not Loading
**Symptom:** Empty table, no errors

**Fix:**
1. Check you're logged in (F12 → Application → Cookies → `admin_token`)
2. Check Network tab: GET request to `/admin/api/products`
3. Check server console for database errors
4. Verify database has products:
   ```bash
   node -e "import('./src/database/db.js').then(m => m.default.query('SELECT COUNT(*) FROM products').then(r => console.log('Products:', r.rows[0].count)))"
   ```

---

### Issue: Can't Add Product
**Symptom:** Submit button doesn't work

**Fix:**
1. **Upload an image** - this is REQUIRED for new products
2. Fill ALL required fields
3. Check file size (<5MB)
4. Check file type (JPEG/PNG/WebP/GIF only)
5. Check console for validation errors

---

### Issue: Image Upload Fails
**Symptom:** "Failed to upload image" error

**Fix:**
1. Verify folder exists: `src/public/uploads/products/`
2. Check file permissions (write access)
3. Check file size (<5MB)
4. Check file type (must be image)
5. Try different image file

---

### Issue: Edit/Delete Buttons Don't Work
**Symptom:** Click buttons, nothing happens

**Fix:**
1. Check browser console for JavaScript errors
2. Verify `products.js` is loaded (Network tab)
3. Check file path in `products.ejs`:
   ```html
   <script src="/js/admin/products.js"></script>
   ```
4. Clear browser cache (Ctrl + Shift + Delete)

---

## ✅ Success Checklist

Before reporting issues, verify:

- [ ] Server running: `nodemon app.js`
- [ ] Admin logged in: Check `admin_token` cookie exists
- [ ] On products page: `http://localhost:3000/admin/products`
- [ ] Browser console: No red errors
- [ ] Network tab: API calls return 200/201
- [ ] Database connected: Products exist in DB
- [ ] All required fields filled when adding/editing
- [ ] Image uploaded when creating new product

---

## 🎓 Understanding the Auth Flow

```
User Request → requireAdmin Middleware → Check admin_token Cookie
                                              ↓
                                         JWT Valid?
                                         ↙        ↘
                                      YES          NO
                                       ↓            ↓
                                  Allow Access   Redirect to /
```

**Key Points:**
1. Admin auth uses JWT tokens (NOT session)
2. Token stored in `admin_token` cookie
3. Token expires after 2 hours
4. Must re-login after expiration
5. Separate from user authentication

---

## 💡 Pro Tips

1. **Bookmark the admin login URL** - you'll need it often
2. **Keep DevTools open** - catch errors immediately
3. **Use descriptive category names** - helps organize products
4. **Test in order: READ → CREATE → UPDATE → DELETE**
5. **Always upload images** - improves user experience
6. **Check server logs** - backend errors show there first

---

## 🆘 Still Not Working?

If CRUD operations still fail after following this guide:

1. **Clear everything:**
   ```bash
   # Stop server (Ctrl+C)
   # Clear browser cache (Ctrl+Shift+Delete)
   # Delete all cookies for localhost
   # Restart server
   nodemon app.js
   ```

2. **Re-login as admin:**
   - Use the full URL with token
   - Verify credentials in `.env`
   - Check `admin_token` cookie is set

3. **Test basic connectivity:**
   - Can you access `/admin/dashboard`?
   - Can you access other admin pages?
   - Does navigation work?

4. **Check file paths:**
   - `src/public/js/admin/products.js` exists?
   - `src/views/admin/products.ejs` exists?
   - `src/controller/admin/adminProductsController.js` exists?

---

## 📞 Environment Variables Needed

Check your `.env` file has these:

```env
# Admin Authentication
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=your-secure-password
ADMIN_LOGIN_TOKEN=3pDcYhOa8yGulaoB6dhat95FPsSeQQ
ADMIN_JWT_SECRET=your-jwt-secret-key
ADMIN_JWT_EXPIRES=2h

# Database (should already exist)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_NAME=brew_and_bean

# Server
PORT=3000
NODE_ENV=development
```

---

**Remember:** You MUST be logged in as admin for CRUD to work! 🔑
