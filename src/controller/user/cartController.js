// Cart Controller for handling cart functionality
import db from '../../database/db.js';

class CartController {
    // Get cart page with items
    static async getCart(req, res) {
        try {
            const userId = req.session.user.id;
            
            // Get or create cart for user
            let cartResult = await db.query(
                'SELECT id FROM cart WHERE user_id = $1',
                [userId]
            );
            
            let cartId;
            if (cartResult.rows.length === 0) {
                // Create new cart
                const newCart = await db.query(
                    'INSERT INTO cart (user_id) VALUES ($1) RETURNING id',
                    [userId]
                );
                cartId = newCart.rows[0].id;
            } else {
                cartId = cartResult.rows[0].id;
            }
            
            // Get cart items with product and variant details
            const cartItems = await db.query(`
                SELECT 
                    ci.id,
                    ci.cart_id,
                    ci.product_id,
                    ci.variant_id,
                    ci.quantity,
                    p.name as product_name,
                    p.description,
                    p.price,
                    p.img_url,
                    pv.name as variant_name
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                LEFT JOIN product_variant pv ON ci.variant_id = pv.id
                WHERE ci.cart_id = $1
                ORDER BY ci.id DESC
            `, [cartId]);
            
            res.render("user/cart", {
                title: "Shopping Cart - Bean & Brew",
                page: "cart",
                cartItems: cartItems.rows,
                cartId: cartId
            });
        } catch (error) {
            console.error("Error rendering cart page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get cart items as JSON
    static async getCartItems(req, res) {
        try {
            const userId = req.session.user.id;
            
            // Get cart
            const cartResult = await db.query(
                'SELECT id FROM cart WHERE user_id = $1',
                [userId]
            );
            
            if (cartResult.rows.length === 0) {
                return res.json({ success: true, items: [], total: 0 });
            }
            
            const cartId = cartResult.rows[0].id;
            
            // Get cart items
            const cartItems = await db.query(`
                SELECT 
                    ci.id,
                    ci.product_id,
                    ci.variant_id,
                    ci.quantity,
                    p.name as product_name,
                    p.description,
                    p.price,
                    p.img_url,
                    pv.name as variant_name,
                    pv.stock_quantity
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                LEFT JOIN product_variant pv ON ci.variant_id = pv.id
                WHERE ci.cart_id = $1
            `, [cartId]);
            
            // Calculate total
            const total = cartItems.rows.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * parseInt(item.quantity));
            }, 0);
            
            res.json({ 
                success: true, 
                items: cartItems.rows,
                total: total.toFixed(2)
            });
        } catch (error) {
            console.error("Error getting cart items:", error);
            res.status(500).json({ success: false, message: "Failed to get cart items" });
        }
    }

    // Add item to cart
    static async addToCart(req, res) {
        try {
            const userId = req.session.user.id;
            const { productId, variantId, quantity } = req.body;
            
            // Validate input
            if (!productId || !quantity || quantity < 1) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid product or quantity" 
                });
            }
            
            // Get or create cart
            let cartResult = await db.query(
                'SELECT id FROM cart WHERE user_id = $1',
                [userId]
            );
            
            let cartId;
            if (cartResult.rows.length === 0) {
                const newCart = await db.query(
                    'INSERT INTO cart (user_id) VALUES ($1) RETURNING id',
                    [userId]
                );
                cartId = newCart.rows[0].id;
            } else {
                cartId = cartResult.rows[0].id;
            }
            
            // Check if item already exists in cart
            const existingItem = await db.query(
                'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id IS NOT DISTINCT FROM $3',
                [cartId, productId, variantId || null]
            );
            
            let updated = false;
            if (existingItem.rows.length > 0) {
                // Update quantity
                const newQuantity = parseInt(existingItem.rows[0].quantity) + parseInt(quantity);
                await db.query(
                    'UPDATE cart_items SET quantity = $1 WHERE id = $2',
                    [newQuantity, existingItem.rows[0].id]
                );
                updated = true;
            } else {
                // Insert new item
                await db.query(
                    'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4)',
                    [cartId, productId, variantId || null, quantity]
                );
            }
            
            res.json({ success: true, message: "Item added to cart", updated: updated });
        } catch (error) {
            console.error("Error adding to cart:", error);
            res.status(500).json({ success: false, message: "Failed to add item to cart" });
        }
    }

    // Remove item from cart
    static async removeFromCart(req, res) {
        try {
            const userId = req.session.user.id;
            const { itemId } = req.params;
            
            // Get user's cart
            const cartResult = await db.query(
                'SELECT id FROM cart WHERE user_id = $1',
                [userId]
            );
            
            if (cartResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Cart not found" });
            }
            
            const cartId = cartResult.rows[0].id;
            
            // Delete item
            const result = await db.query(
                'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2',
                [itemId, cartId]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: "Item not found in cart" });
            }
            
            res.json({ success: true, message: "Item removed from cart" });
        } catch (error) {
            console.error("Error removing from cart:", error);
            res.status(500).json({ success: false, message: "Failed to remove item from cart" });
        }
    }

    // Update cart item quantity
    static async updateCartItem(req, res) {
        try {
            const userId = req.session.user.id;
            const { itemId } = req.params;
            const { quantity } = req.body;
            
            // Validate quantity
            if (!quantity || quantity < 1) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid quantity" 
                });
            }
            
            // Get user's cart
            const cartResult = await db.query(
                'SELECT id FROM cart WHERE user_id = $1',
                [userId]
            );
            
            if (cartResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: "Cart not found" });
            }
            
            const cartId = cartResult.rows[0].id;
            
            // Update quantity
            const result = await db.query(
                'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3',
                [quantity, itemId, cartId]
            );
            
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: "Item not found in cart" });
            }
            
            res.json({ success: true, message: "Cart updated" });
        } catch (error) {
            console.error("Error updating cart:", error);
            res.status(500).json({ success: false, message: "Failed to update cart" });
        }
    }

    // Clear entire cart
    static async clearCart(req, res) {
        try {
            const userId = req.session.user.id;
            
            // Get user's cart
            const cartResult = await db.query(
                'SELECT id FROM cart WHERE user_id = $1',
                [userId]
            );
            
            if (cartResult.rows.length === 0) {
                return res.json({ success: true, message: "Cart is already empty" });
            }
            
            const cartId = cartResult.rows[0].id;
            
            // Delete all items
            await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
            
            res.json({ success: true, message: "Cart cleared" });
        } catch (error) {
            console.error("Error clearing cart:", error);
            res.status(500).json({ success: false, message: "Failed to clear cart" });
        }
    }

    // Get cart item count
    static async getCartCount(req, res) {
        try {
            const userId = req.session.user.id;
            
            // Get user's cart
            const cartResult = await db.query(
                'SELECT id FROM cart WHERE user_id = $1',
                [userId]
            );
            
            if (cartResult.rows.length === 0) {
                return res.json({ success: true, count: 0 });
            }
            
            const cartId = cartResult.rows[0].id;
            
            // Count cart items
            const countResult = await db.query(
                'SELECT COUNT(*) as count FROM cart_items WHERE cart_id = $1',
                [cartId]
            );
            
            res.json({ 
                success: true, 
                count: parseInt(countResult.rows[0].count) || 0 
            });
        } catch (error) {
            console.error("Error getting cart count:", error);
            res.status(500).json({ success: false, count: 0 });
        }
    }
}

export default CartController;