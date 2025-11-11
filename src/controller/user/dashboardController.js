// Dashboard Controller for handling user dashboard
import db from '../../database/db.js';

class DashboardController {
    static async getDashboard(req, res) {
        try {
            res.render("user/dashboard", {
                title: "Dashboard - Bean & Brew",
                page: "dashboard"
            });
        } catch (error) {
            console.error("Error rendering dashboard page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get user statistics
    static async getUserStats(req, res) {
        try {
            const userId = req.session?.user?.id;
            
            if (!userId) {
                return res.status(401).json({ success: false, message: "Not authenticated" });
            }

            // Get total orders count
            const ordersCountResult = await db.query(
                'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
                [userId]
            );

            // Get cart items count
            const cartResult = await db.query(
                `SELECT COALESCE(SUM(ci.quantity), 0) as total 
                 FROM cart c 
                 LEFT JOIN cart_items ci ON c.id = ci.cart_id 
                 WHERE c.user_id = $1`,
                [userId]
            );

            // Get total spent (completed orders only)
            const spentResult = await db.query(
                `SELECT COALESCE(SUM(total_amount), 0) as total 
                 FROM orders 
                 WHERE user_id = $1 AND order_status = 'completed'`,
                [userId]
            );

            // Get pending orders count
            const pendingResult = await db.query(
                `SELECT COUNT(*) as total 
                 FROM orders 
                 WHERE user_id = $1 AND order_status IN ('pending', 'processing', 'preparing')`,
                [userId]
            );

            res.json({
                success: true,
                stats: {
                    totalOrders: parseInt(ordersCountResult.rows[0].total) || 0,
                    cartItems: parseInt(cartResult.rows[0].total) || 0,
                    totalSpent: parseFloat(spentResult.rows[0].total) || 0,
                    pendingOrders: parseInt(pendingResult.rows[0].total) || 0
                }
            });
        } catch (error) {
            console.error("Error fetching user stats:", error);
            res.status(500).json({ success: false, message: "Failed to fetch statistics" });
        }
    }

    // Get recent orders
    static async getRecentOrders(req, res) {
        try {
            const userId = req.session?.user?.id;
            
            if (!userId) {
                return res.status(401).json({ success: false, message: "Not authenticated" });
            }

            const ordersResult = await db.query(
                `SELECT 
                    id,
                    order_status,
                    payment_method,
                    total_amount,
                    created_at
                 FROM orders 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT 5`,
                [userId]
            );

            res.json({
                success: true,
                orders: ordersResult.rows
            });
        } catch (error) {
            console.error("Error fetching recent orders:", error);
            res.status(500).json({ success: false, message: "Failed to fetch orders" });
        }
    }

    // Get cart preview
    static async getCartPreview(req, res) {
        try {
            const userId = req.session?.user?.id;
            
            if (!userId) {
                return res.status(401).json({ success: false, message: "Not authenticated" });
            }

            // Get cart items with product details
            const cartResult = await db.query(
                `SELECT 
                    ci.id,
                    ci.quantity,
                    p.name as product_name,
                    p.img_url,
                    p.price,
                    pv.name as variant_name,
                    (p.price * ci.quantity) as item_total
                 FROM cart c
                 JOIN cart_items ci ON c.id = ci.cart_id
                 JOIN product_variant pv ON ci.variant_id = pv.id
                 JOIN products p ON pv.product_id = p.id
                 WHERE c.user_id = $1
                 ORDER BY ci.id DESC
                 LIMIT 5`,
                [userId]
            );

            // Calculate cart total
            const totalResult = await db.query(
                `SELECT COALESCE(SUM(p.price * ci.quantity), 0) as total
                 FROM cart c
                 JOIN cart_items ci ON c.id = ci.cart_id
                 JOIN product_variant pv ON ci.variant_id = pv.id
                 JOIN products p ON pv.product_id = p.id
                 WHERE c.user_id = $1`,
                [userId]
            );

            res.json({
                success: true,
                cartItems: cartResult.rows,
                cartTotal: parseFloat(totalResult.rows[0].total) || 0
            });
        } catch (error) {
            console.error("Error fetching cart preview:", error);
            res.status(500).json({ success: false, message: "Failed to fetch cart" });
        }
    }
}

export default DashboardController;