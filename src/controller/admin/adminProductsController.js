import fs from "fs";
import path from "path";
import multer from "multer";
import db from "../../database/db.js";

// ============================================
// MULTER CONFIGURATION FOR IMAGE UPLOADS
// ============================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'src', 'public', 'uploads', 'products');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const baseName = path.parse(file.originalname).name
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9-]/g, '');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${timestamp}-${baseName}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedExts = /\.(jpeg|jpg|png|webp|gif)$/i;
    
    const ext = path.extname(file.originalname);
    const mimeValid = allowedMimes.includes(file.mimetype);
    const extValid = allowedExts.test(ext);
    
    if (mimeValid && extValid) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
    }
};

export const upload = multer({ 
    storage, 
    fileFilter, 
    limits: { 
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1 
    } 
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert absolute disk path to web-accessible path
 * @param {string} diskPath - Absolute file path
 * @returns {string|null} Web path starting with /uploads/...
 */
const diskPathToWeb = (diskPath) => {
    if (!diskPath) return null;
    
    try {
        const normalizedPath = diskPath.replace(/\\/g, '/');
        const publicIndex = normalizedPath.indexOf('src/public');
        
        if (publicIndex === -1) {
            // Fallback: assume path is already relative
            return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
        }
        
        const webPath = normalizedPath.slice(publicIndex + 'src/public'.length);
        return webPath.startsWith('/') ? webPath : `/${webPath}`;
    } catch (error) {
        console.error('Error converting disk path to web path:', error);
        return null;
    }
};

/**
 * Delete file from filesystem if it exists
 * @param {string} webPath - Web path to file (e.g., /uploads/products/...)
 */
const deleteFileIfExists = async (webPath) => {
    if (!webPath) return;
    
    try {
        const relativePath = webPath.startsWith('/') ? webPath.slice(1) : webPath;
        const absolutePath = path.join(process.cwd(), 'src', 'public', relativePath);
        
        await fs.promises.access(absolutePath);
        await fs.promises.unlink(absolutePath);
        
        console.log(`Deleted file: ${absolutePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, ignore
            return;
        }
        console.error('Error deleting file:', error);
    }
};

/**
 * Validate product data
 * @param {Object} data - Product data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} { valid: boolean, errors: array }
 */
const validateProductData = (data, isUpdate = false) => {
    const errors = [];
    
    if (!isUpdate || data.name !== undefined) {
        if (!data.name || !data.name.trim()) {
            errors.push('Product name is required');
        }
    }
    
    if (!isUpdate || data.price !== undefined) {
        const price = parseFloat(data.price);
        if (isNaN(price) || price < 0) {
            errors.push('Valid price is required (must be >= 0)');
        }
    }
    
    if (!isUpdate || data.stock_quantity !== undefined) {
        const stock = parseInt(data.stock_quantity, 10);
        if (isNaN(stock) || stock < 0) {
            errors.push('Valid stock quantity is required (must be integer >= 0)');
        }
    }
    
    if (!isUpdate || data.description !== undefined) {
        if (!data.description || !data.description.trim()) {
            errors.push('Product description is required');
        }
    }
    
    if (!isUpdate || data.variant_name !== undefined) {
        if (!data.variant_name || !data.variant_name.trim()) {
            errors.push('Product category is required');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

// ============================================
// ADMIN PRODUCTS CONTROLLER
// ============================================

class AdminProductsController {
    /**
     * Render the admin products management page
     */
    static getProducts(req, res) {
        try {
            res.render("admin/products", {
                title: "Product Management - Bean & Brew Admin",
                page: "admin-products"
            });
        } catch (error) {
            console.error("Error rendering admin products page:", error);
            res.status(500).render("error", { 
                message: "Internal Server Error",
                error: process.env.NODE_ENV === 'development' ? error : {}
            });
        }
    }

    /**
     * Get all products with their variants
     * Returns products with first variant (category) and stock information
     */
    static async getAllProducts(req, res) {
        try {
            console.log('[ProductsController] getAllProducts called');
            
            const query = `
                SELECT 
                    p.id, 
                    p.img_url, 
                    p.name, 
                    p.price, 
                    p.description, 
                    p.created_at, 
                    p.updated_at,
                    pv.name AS variant_name, 
                    pv.stock_quantity
                FROM products p
                LEFT JOIN LATERAL (
                    SELECT name, stock_quantity 
                    FROM product_variant 
                    WHERE product_id = p.id 
                    ORDER BY id 
                    LIMIT 1
                ) pv ON true
                ORDER BY p.id DESC
            `;
            
            const result = await db.query(query);
            console.log(`[ProductsController] Found ${result.rows.length} products`);
            
            res.json({ 
                success: true, 
                products: result.rows,
                count: result.rows.length
            });
        } catch (error) {
            console.error("[ProductsController] Error fetching products:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to fetch products",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Create new product with variant
     * Expects multipart/form-data with fields: name, price, description, variant_name, stock_quantity
     * Optional file field: image
     */
    static async createProduct(req, res) {
        const client = await db.connect();
        
        try {
            console.log('[ProductsController] createProduct called');
            console.log('[ProductsController] Body:', req.body);
            console.log('[ProductsController] File:', req.file ? 'Uploaded' : 'No file');
            
            const { name, price, description, variant_name, stock_quantity } = req.body;
            
            // Validate input data
            const validation = validateProductData(req.body, false);
            if (!validation.valid) {
                console.log('[ProductsController] Validation failed:', validation.errors);
                // Delete uploaded file if validation fails
                if (req.file) {
                    await deleteFileIfExists(diskPathToWeb(req.file.path));
                }
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed',
                    errors: validation.errors 
                });
            }
            
            // Check if image is provided (required for create)
            if (!req.file) {
                console.log('[ProductsController] No image provided');
                return res.status(400).json({ 
                    success: false, 
                    message: 'Product image is required',
                    errors: ['Please upload a product image'] 
                });
            }
            
            const parsedPrice = parseFloat(price);
            const parsedStock = parseInt(stock_quantity, 10);
            
            // Handle image upload
            let imgWebPath = null;
            if (req.file) {
                imgWebPath = diskPathToWeb(req.file.path);
                console.log('[ProductsController] Image path:', imgWebPath);
            }
            
            // Check for duplicate products (within last 5 seconds to prevent accidental double-submit)
            const dupCheck = await client.query(
                `SELECT id FROM products 
                 WHERE name = $1 
                 AND price IS NOT DISTINCT FROM $2 
                 AND description IS NOT DISTINCT FROM $3 
                 AND created_at > NOW() - INTERVAL '5 seconds' 
                 LIMIT 1`,
                [name, parsedPrice, description]
            );
            
            if (dupCheck.rows.length > 0) {
                const existingId = dupCheck.rows[0].id;
                const existing = await client.query(
                    `SELECT p.id, p.img_url, p.name, p.price, p.description, 
                            pv.name AS variant_name, pv.stock_quantity 
                     FROM products p
                     LEFT JOIN LATERAL (
                         SELECT name, stock_quantity 
                         FROM product_variant 
                         WHERE product_id = p.id 
                         ORDER BY id 
                         LIMIT 1
                     ) pv ON true 
                     WHERE p.id = $1`,
                    [existingId]
                );
                
                // Delete the new uploaded file since we're using existing product
                if (req.file) {
                    await deleteFileIfExists(imgWebPath);
                }
                
                return res.json({ 
                    success: true, 
                    product: existing.rows[0], 
                    note: 'Duplicate detected - returned existing product' 
                });
            }
            
            // Start transaction
            await client.query('BEGIN');
            
            try {
                // Insert product
                const productQuery = `
                    INSERT INTO products (img_url, name, price, description, created_at, updated_at) 
                    VALUES ($1, $2, $3, $4, NOW(), NOW()) 
                    RETURNING *
                `;
                const productResult = await client.query(productQuery, [
                    imgWebPath, 
                    name, 
                    parsedPrice, 
                    description
                ]);
                const product = productResult.rows[0];
                
                // Insert product variant (category and stock)
                const variantQuery = `
                    INSERT INTO product_variant (product_id, name, stock_quantity, created_at, updated_at) 
                    VALUES ($1, $2, $3, NOW(), NOW())
                `;
                await client.query(variantQuery, [
                    product.id, 
                    variant_name || null, 
                    parsedStock || 0
                ]);
                
                await client.query('COMMIT');
                
                // Fetch complete product with variant
                const completeProduct = await client.query(
                    `SELECT p.id, p.img_url, p.name, p.price, p.description, 
                            pv.name AS variant_name, pv.stock_quantity 
                     FROM products p
                     LEFT JOIN LATERAL (
                         SELECT name, stock_quantity 
                         FROM product_variant 
                         WHERE product_id = p.id 
                         ORDER BY id 
                         LIMIT 1
                     ) pv ON true 
                     WHERE p.id = $1`,
                    [product.id]
                );
                
                res.status(201).json({ 
                    success: true, 
                    product: completeProduct.rows[0],
                    message: 'Product created successfully'
                });
            } catch (error) {
                await client.query('ROLLBACK');
                
                // Delete uploaded file on error
                if (imgWebPath) {
                    await deleteFileIfExists(imgWebPath);
                }
                
                throw error;
            }
        } catch (error) {
            console.error("Error creating product:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to create product",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    /**
     * Update existing product
     * Expects multipart/form-data with optional fields: name, price, description, variant_name, stock_quantity
     * Optional file field: image (replaces existing image)
     */
    static async updateProduct(req, res) {
        const client = await db.connect();
        
        try {
            const { productId } = req.params;
            const { name, price, description, variant_name, stock_quantity } = req.body;
            
            // Validate product ID
            if (!productId || isNaN(parseInt(productId))) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid product ID' 
                });
            }
            
            // Fetch existing product
            const existingProduct = await client.query(
                'SELECT * FROM products WHERE id = $1', 
                [productId]
            );
            
            if (existingProduct.rows.length === 0) {
                // Delete uploaded file if product doesn't exist
                if (req.file) {
                    await deleteFileIfExists(diskPathToWeb(req.file.path));
                }
                return res.status(404).json({ 
                    success: false, 
                    message: 'Product not found' 
                });
            }
            
            const oldProduct = existingProduct.rows[0];
            
            // Validate updated data
            const validation = validateProductData(req.body, true);
            if (!validation.valid) {
                if (req.file) {
                    await deleteFileIfExists(diskPathToWeb(req.file.path));
                }
                return res.status(400).json({ 
                    success: false, 
                    message: 'Validation failed',
                    errors: validation.errors 
                });
            }
            
            // Handle image replacement
            let imgWebPath = oldProduct.img_url;
            if (req.file) {
                const newImagePath = diskPathToWeb(req.file.path);
                
                // Delete old image
                if (oldProduct.img_url) {
                    await deleteFileIfExists(oldProduct.img_url);
                }
                
                imgWebPath = newImagePath;
            }
            
            // Start transaction
            await client.query('BEGIN');
            
            try {
                // Update product
                const productQuery = `
                    UPDATE products 
                    SET img_url = $1, 
                        name = $2, 
                        price = $3, 
                        description = $4, 
                        updated_at = NOW() 
                    WHERE id = $5 
                    RETURNING *
                `;
                await client.query(productQuery, [
                    imgWebPath,
                    name !== undefined ? name : oldProduct.name,
                    price !== undefined ? parseFloat(price) : oldProduct.price,
                    description !== undefined ? description : oldProduct.description,
                    productId
                ]);
                
                // Update or create product variant
                if (variant_name !== undefined || stock_quantity !== undefined) {
                    const existingVariant = await client.query(
                        'SELECT id FROM product_variant WHERE product_id = $1 ORDER BY id LIMIT 1',
                        [productId]
                    );
                    
                    if (existingVariant.rows.length > 0) {
                        // Update existing variant
                        await client.query(
                            `UPDATE product_variant 
                             SET name = $1, 
                                 stock_quantity = $2, 
                                 updated_at = NOW() 
                             WHERE id = $3`,
                            [
                                variant_name !== undefined ? variant_name : null,
                                stock_quantity !== undefined ? parseInt(stock_quantity, 10) : 0,
                                existingVariant.rows[0].id
                            ]
                        );
                    } else {
                        // Create new variant
                        await client.query(
                            `INSERT INTO product_variant (product_id, name, stock_quantity, created_at, updated_at) 
                             VALUES ($1, $2, $3, NOW(), NOW())`,
                            [
                                productId,
                                variant_name || null,
                                stock_quantity ? parseInt(stock_quantity, 10) : 0
                            ]
                        );
                    }
                }
                
                await client.query('COMMIT');
                
                // Fetch updated product with variant
                const updatedProduct = await client.query(
                    `SELECT p.id, p.img_url, p.name, p.price, p.description, 
                            pv.name AS variant_name, pv.stock_quantity 
                     FROM products p
                     LEFT JOIN LATERAL (
                         SELECT name, stock_quantity 
                         FROM product_variant 
                         WHERE product_id = p.id 
                         ORDER BY id 
                         LIMIT 1
                     ) pv ON true 
                     WHERE p.id = $1`,
                    [productId]
                );
                
                res.json({ 
                    success: true, 
                    product: updatedProduct.rows[0],
                    message: 'Product updated successfully'
                });
            } catch (error) {
                await client.query('ROLLBACK');
                
                // If new image was uploaded, delete it on error
                if (req.file) {
                    await deleteFileIfExists(diskPathToWeb(req.file.path));
                }
                
                throw error;
            }
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to update product",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    /**
     * Delete product and associated variants
     * Also removes product image from filesystem
     */
    static async deleteProduct(req, res) {
        const client = await db.connect();
        
        try {
            const { productId } = req.params;
            
            // Validate product ID
            if (!productId || isNaN(parseInt(productId))) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid product ID' 
                });
            }
            
            // Fetch existing product
            const existingProduct = await client.query(
                'SELECT * FROM products WHERE id = $1', 
                [productId]
            );
            
            if (existingProduct.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Product not found' 
                });
            }
            
            const product = existingProduct.rows[0];
            
            // Start transaction
            await client.query('BEGIN');
            
            try {
                // Delete product variants first
                await client.query(
                    'DELETE FROM product_variant WHERE product_id = $1', 
                    [productId]
                );
                
                // Delete product
                await client.query(
                    'DELETE FROM products WHERE id = $1', 
                    [productId]
                );
                
                await client.query('COMMIT');
                
                // Delete image file after successful database deletion
                if (product.img_url) {
                    await deleteFileIfExists(product.img_url);
                }
                
                res.json({ 
                    success: true, 
                    message: 'Product deleted successfully' 
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error("Error deleting product:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to delete product",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }

    /**
     * Update product stock quantity
     * Updates the stock_quantity in product_variant table
     */
    static async updateStock(req, res) {
        const client = await db.connect();
        
        try {
            const { productId } = req.params;
            const { stock } = req.body;
            
            // Validate inputs
            if (!productId || isNaN(parseInt(productId))) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid product ID' 
                });
            }
            
            const stockQuantity = parseInt(stock, 10);
            if (isNaN(stockQuantity) || stockQuantity < 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid stock quantity (must be >= 0)' 
                });
            }
            
            // Check if product exists
            const productExists = await client.query(
                'SELECT id FROM products WHERE id = $1', 
                [productId]
            );
            
            if (productExists.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Product not found' 
                });
            }
            
            // Update variant stock or create variant if doesn't exist
            const existingVariant = await client.query(
                'SELECT id FROM product_variant WHERE product_id = $1 ORDER BY id LIMIT 1',
                [productId]
            );
            
            if (existingVariant.rows.length > 0) {
                // Update existing variant
                await client.query(
                    `UPDATE product_variant 
                     SET stock_quantity = $1, 
                         updated_at = NOW() 
                     WHERE id = $2`,
                    [stockQuantity, existingVariant.rows[0].id]
                );
            } else {
                // Create new variant with stock
                await client.query(
                    `INSERT INTO product_variant (product_id, stock_quantity, created_at, updated_at) 
                     VALUES ($1, $2, NOW(), NOW())`,
                    [productId, stockQuantity]
                );
            }
            
            res.json({ 
                success: true, 
                message: "Stock updated successfully",
                stock: stockQuantity
            });
        } catch (error) {
            console.error("Error updating stock:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to update stock",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            client.release();
        }
    }
}

export default AdminProductsController;