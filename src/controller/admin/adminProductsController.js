import fs from "fs";
import path from "path";
import multer from "multer";
import db from "../../database/db.js";

// Multer storage: place uploads under src/public/uploads/products (no dated subfolders)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'src', 'public', 'uploads', 'products');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const base = path.parse(file.originalname).name.replace(/\s+/g, '-');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${base}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext.replace('.', '')) || allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
};

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// helper to convert absolute disk path to web path (starting with /uploads/...)
const diskPathToWeb = (diskPath) => {
    if (!diskPath) return null;
    const publicIndex = diskPath.indexOf(path.join('src', 'public'));
    if (publicIndex === -1) return diskPath.replace(/\\/g, '/');
    const sub = diskPath.slice(publicIndex + path.join('src', 'public').length);
    return sub.replace(/\\/g, '/');
};

const deleteFileIfExists = async (webPath) => {
    if (!webPath) return;
    // webPath should start with '/uploads/...'
    const rel = webPath.startsWith('/') ? webPath.slice(1) : webPath;
    const abs = path.join(process.cwd(), 'src', 'public', rel);
    try {
        await fs.promises.unlink(abs);
    } catch (err) {
        // If file doesn't exist, ignore
        if (err.code !== 'ENOENT') console.error('Failed deleting file', abs, err);
    }
};

// Admin Products Management Controller

class AdminProductsController {
    static getProducts(req, res) {
        try {
            res.render("admin/products", {
                title: "Product Management - Bean & Brew Admin",
                page: "admin-products"
            });
        } catch (error) {
            console.error("Error rendering admin products page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get all products
    static getAllProducts(req, res) {
        try {
            // Fetch products and include one variant (category) and stock if present
            const q = `
                SELECT p.id, p.img_url, p.name, p.price, p.description, p.created_at, p.updated_at,
                       pv.name AS variant_name, pv.stock_quantity
                FROM products p
                LEFT JOIN LATERAL (
                  SELECT name, stock_quantity FROM product_variant WHERE product_id = p.id ORDER BY id LIMIT 1
                ) pv ON true
                ORDER BY p.id DESC
            `;
            db.query(q).then(result => {
                res.json({ success: true, products: result.rows });
            }).catch(err => {
                console.error('DB error fetching products', err);
                res.status(500).json({ success: false, message: 'Failed to fetch products' });
            });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ success: false, message: "Failed to fetch products" });
        }
    }

    // Create new product
    // expects multipart/form-data with optional file field 'image'
    static async createProduct(req, res) {
        try {
            // Accept variant_name (category) and stock_quantity as fields for product_variant
            const { name, price, description, variant_name, stock_quantity } = req.body;
            const parsedPrice = price ? parseFloat(price) : null;
            const parsedStock = stock_quantity ? parseInt(stock_quantity, 10) : null;
            let imgWebPath = null;
            if (req.file) {
                imgWebPath = diskPathToWeb(req.file.path);
            }

            // Guard: avoid accidental duplicate inserts when the same payload is submitted repeatedly
            // Check for a recently-created product with same name/price/description (last 5 seconds)
            if (name) {
                const dupCheck = await db.query(`SELECT id FROM products WHERE name = $1 AND price IS NOT DISTINCT FROM $2 AND description IS NOT DISTINCT FROM $3 AND created_at > NOW() - INTERVAL '5 seconds' LIMIT 1`, [name, parsedPrice, description]);
                if (dupCheck.rows.length) {
                    const existingId = dupCheck.rows[0].id;
                    const existing = await db.query(`SELECT p.id, p.img_url, p.name, p.price, p.description, pv.name AS variant_name, pv.stock_quantity FROM products p LEFT JOIN LATERAL (SELECT name, stock_quantity FROM product_variant WHERE product_id = p.id ORDER BY id LIMIT 1) pv ON true WHERE p.id = $1`, [existingId]);
                    return res.json({ success: true, product: existing.rows[0], note: 'duplicate-guard' });
                }
            }

            // Use a transaction for product + variant inserts so we don't end up with partial data on error
            await db.query('BEGIN');
            try {
                const q = `INSERT INTO products (img_url, name, price, description, created_at, updated_at) VALUES ($1,$2,$3,$4, NOW(), NOW()) RETURNING *`;
                const values = [imgWebPath, name, parsedPrice, description];
                const result = await db.query(q, values);
                const prod = result.rows[0];

                if (variant_name || parsedStock !== null) {
                    await db.query(`INSERT INTO product_variant (product_id, name, stock_quantity, created_at, updated_at) VALUES ($1,$2,$3, NOW(), NOW())`, [prod.id, variant_name || null, parsedStock || 0]);
                }

                await db.query('COMMIT');

                // return product enriched by a query (including variant)
                const p = await db.query(`SELECT p.id, p.img_url, p.name, p.price, p.description, pv.name AS variant_name, pv.stock_quantity FROM products p LEFT JOIN LATERAL (SELECT name, stock_quantity FROM product_variant WHERE product_id = p.id ORDER BY id LIMIT 1) pv ON true WHERE p.id = $1`, [prod.id]);
                return res.json({ success: true, product: p.rows[0] });
            } catch (e) {
                await db.query('ROLLBACK');
                throw e;
            }
        } catch (error) {
            console.error("Error creating product:", error);
            res.status(500).json({ success: false, message: "Failed to create product" });
        }
    }

    // Update product
    // expects multipart/form-data with optional file field 'image'
    static async updateProduct(req, res) {
        try {
            const { productId } = req.params;
            const { name, price, description } = req.body;
            const parsedPrice = price ? parseFloat(price) : null;

            // Fetch existing product to know existing image
            const existing = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
            if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
            const old = existing.rows[0];

            // handle image replacement
            let imgWebPath = old.img_url;
            if (req.file) {
                imgWebPath = diskPathToWeb(req.file.path);
                await deleteFileIfExists(old.img_url);
            }

            const q = `UPDATE products SET img_url=$1, name=$2, price=$3, description=$4, updated_at=NOW() WHERE id=$5 RETURNING *`;
            const values = [imgWebPath, name || old.name, parsedPrice !== null ? parsedPrice : old.price, description || old.description, productId];
            const result = await db.query(q, values);

            // update or insert a single variant for this product if provided
            const { variant_name, stock_quantity } = req.body;
            if (variant_name !== undefined || stock_quantity !== undefined) {
                // check existing variant
                const ev = await db.query('SELECT id FROM product_variant WHERE product_id = $1 ORDER BY id LIMIT 1', [productId]);
                if (ev.rows.length) {
                    await db.query('UPDATE product_variant SET name=$1, stock_quantity=$2, updated_at=NOW() WHERE id=$3', [variant_name || null, stock_quantity ? parseInt(stock_quantity,10) : 0, ev.rows[0].id]);
                } else {
                    await db.query('INSERT INTO product_variant (product_id, name, stock_quantity, created_at, updated_at) VALUES ($1,$2,$3, NOW(), NOW())', [productId, variant_name || null, stock_quantity ? parseInt(stock_quantity,10) : 0]);
                }
            }

            const p = await db.query(`SELECT p.id, p.img_url, p.name, p.price, p.description, pv.name AS variant_name, pv.stock_quantity FROM products p LEFT JOIN LATERAL (SELECT name, stock_quantity FROM product_variant WHERE product_id = p.id ORDER BY id LIMIT 1) pv ON true WHERE p.id = $1`, [productId]);
            res.json({ success: true, product: p.rows[0] });
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).json({ success: false, message: "Failed to update product" });
        }
    }

    // Delete product
    static async deleteProduct(req, res) {
        try {
            const { productId } = req.params;
            const existing = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
            if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
            const prod = existing.rows[0];

            // delete image file if exists
            await deleteFileIfExists(prod.img_url);
            // delete product_variant rows explicitly (safe even if ON DELETE CASCADE exists)
            await db.query('DELETE FROM product_variant WHERE product_id = $1', [productId]);
            // delete product record
            await db.query('DELETE FROM products WHERE id = $1', [productId]);
            res.json({ success: true, message: 'Product deleted' });
        } catch (error) {
            console.error("Error deleting product:", error);
            res.status(500).json({ success: false, message: "Failed to delete product" });
        }
    }

    // Update product stock
    static updateStock(req, res) {
        try {
            // Implementation for updating product stock
            const { productId } = req.params;
            const { stock } = req.body;
            res.json({ success: true, message: "Stock updated successfully" });
        } catch (error) {
            console.error("Error updating stock:", error);
            res.status(500).json({ success: false, message: "Failed to update stock" });
        }
    }
}

export default AdminProductsController;