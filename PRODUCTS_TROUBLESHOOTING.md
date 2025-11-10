# 🔍 PRODUCTS PAGE TROUBLESHOOTING GUIDE

## Issues Fixed:

### 1. ✅ JavaScript File Path
- **Problem**: EJS was loading `/js/admin/products_NEW.js` instead of `/js/admin/products.js`
- **Fixed**: Updated script src to `/js/admin/products.js`

### 2. ✅ Validation Enhanced
- **Added**: Category (variant_name) validation
- **Added**: Better error messages
- **Added**: Console logging for debugging

### 3. ✅ Image Requirement
- **Clarified**: Image is REQUIRED when creating new products
- **Added**: Clear error message when image is missing

## How to Test:

### Step 1: Start the Server
```bash
cd "c:/Users/Marqueses/Documents/TIP/IT 3rd yr 1st sem/integrative/Brew and bean"
nodemon app.js
```

### Step 2: Access the Products Page
Navigate to: `http://localhost:3000/admin/products`

### Step 3: Check Browser Console
Open browser DevTools (F12) and check:
- Console tab for any JavaScript errors
- Network tab to see API calls

### Step 4: Test Loading Products
- Page should automatically load existing products (you have 2 in database)
- Check console for: `[ProductsController] Found X products`

### Step 5: Test Adding Product
Click "Add New Product" and fill in:
- **Name**: Test Coffee *(required)*
- **Price**: 150.00 *(required)*
- **Category**: Select "hot", "cold", or "special" *(required)*
- **Stock**: 100 *(required)*
- **Description**: A delicious test coffee *(required)*
- **Image**: Upload a JPG/PNG file *(required)*

## Common Issues:

### Products Not Loading?
**Check:**
1. Server console for `[ProductsController] getAllProducts called`
2. Browser console for errors
3. Network tab - is `/admin/api/products` returning 200?

**Fix:**
- Ensure you're logged in as admin
- Check database connection
- Run: `node -e "import('./src/database/db.js').then(m => m.default.query('SELECT COUNT(*) FROM products').then(r => console.log('Products:', r.rows[0].count)).finally(() => process.exit()))"`

### Can't Add Product?
**Check:**
1. All required fields are filled
2. Image file is selected (MAX 5MB)
3. Category is selected
4. Server console for validation errors

**Error Messages:**
- "Validation failed" - Check which fields are missing
- "Product image is required" - You must upload an image
- "Invalid stock quantity" - Stock must be a whole number >= 0

### Image Upload Fails?
**Check:**
1. File size < 5MB
2. File type is JPEG, PNG, WebP, or GIF
3. Folder exists: `src/public/uploads/products/`

**Fix:**
```bash
mkdir -p "src/public/uploads/products"
```

## Database Schema:

### Products Table:
```sql
- id (bigint)
- img_url (bigint) -- web path like /uploads/products/...
- name (varchar)
- price (decimal)
- description (varchar)
- created_at (timestamp)
- updated_at (timestamp)
```

### Product_Variant Table:
```sql
- id (bigint)
- product_id (bigint) -- FK to products
- name (varchar) -- category: 'hot', 'cold', 'special'
- stock_quantity (bigint)
- created_at (timestamp)
- updated_at (timestamp)
```

## API Endpoints:

### GET /admin/api/products
Returns all products with variants
```json
{
  "success": true,
  "products": [...],
  "count": 2
}
```

### POST /admin/api/products
Create new product (multipart/form-data)
**Required fields:**
- name
- price
- description
- variant_name (category)
- stock_quantity
- image (file)

### PUT /admin/api/products/:id
Update product (multipart/form-data)
**Optional fields:** All fields optional except ID

### DELETE /admin/api/products/:id
Delete product and its variants

## Console Logs to Look For:

### Success:
```
[ProductsController] getAllProducts called
[ProductsController] Found 2 products
[ProductsController] createProduct called
[ProductsController] Body: { name: 'Test', price: '150', ... }
[ProductsController] File: Uploaded
[ProductsController] Image path: /uploads/products/1234567890-test.jpg
```

### Errors:
```
[ProductsController] Validation failed: ['Product name is required']
[ProductsController] No image provided
```

## Quick Fix Checklist:

- [ ] Server is running on port 3000
- [ ] You're logged in as admin
- [ ] Database connection is working
- [ ] Products table exists
- [ ] Product_variant table exists
- [ ] JavaScript file loads correctly
- [ ] No errors in browser console
- [ ] API endpoint returns data

## Need More Help?

1. Check server console for detailed error messages
2. Check browser console (F12) for JavaScript errors
3. Check Network tab to see if API calls are successful
4. Verify database has products: Run the test command above

## Working Example:

### Create Product Request:
```
POST /admin/api/products
Content-Type: multipart/form-data

name: Cappuccino
price: 120.00
description: Classic Italian coffee with steamed milk
variant_name: hot
stock_quantity: 50
image: [FILE: cappuccino.jpg]
```

### Response:
```json
{
  "success": true,
  "product": {
    "id": 3,
    "name": "Cappuccino",
    "price": 120.00,
    "description": "Classic Italian coffee with steamed milk",
    "variant_name": "hot",
    "stock_quantity": 50,
    "img_url": "/uploads/products/1699999999-cappuccino.jpg"
  },
  "message": "Product created successfully"
}
```
