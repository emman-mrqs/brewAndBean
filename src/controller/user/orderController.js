// Order Controller for handling order-related pages and API
import pool from '../../database/db.js';

class OrderController {
    static async getOrderHistory(req, res) {
        try {
            res.render("user/orderHistory", {
                title: "Order History - Bean & Brew",
                page: "orderHistory",
                isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
                user: req.user || null
            });
        } catch (error) {
            console.error("Error rendering order history page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get order history data (API) - only completed and cancelled orders
    static async getOrderHistoryData(req, res) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const query = `
                SELECT 
                    o.id,
                    o.order_status,
                    o.payment_status,
                    o.payment_method,
                    o.total_amount,
                    o.created_at,
                    o.updated_at,
                    b.name as branch_name,
                    b.city as branch_city,
                    COUNT(oi.id) as item_count,
                    STRING_AGG(DISTINCT p.name || ' (' || pv.name || ')', ', ') as items
                FROM orders o
                LEFT JOIN branches b ON o.branch_id = b.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN product_variant pv ON oi.product_variant_id = pv.id
                LEFT JOIN products p ON pv.product_id = p.id
                WHERE o.user_id = $1 
                AND o.order_status IN ('completed', 'cancelled')
                GROUP BY o.id, b.name, b.city
                ORDER BY o.created_at DESC
            `;

            const result = await pool.query(query, [userId]);

            res.json({
                success: true,
                orders: result.rows
            });

        } catch (error) {
            console.error('Error fetching order history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order history',
                error: error.message
            });
        }
    }

    static async getOrderPreview(req, res) {
        try {
            res.render("user/orderPreview", {
                title: "Current Orders - Bean & Brew",
                page: "orderPreview",
                isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
                user: req.user || null
            });
        } catch (error) {
            console.error("Error rendering order preview page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get current orders (API) - all orders except completed and cancelled
    static async getCurrentOrders(req, res) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const query = `
                SELECT 
                    o.id,
                    o.order_status,
                    o.payment_status,
                    o.payment_method,
                    o.total_amount,
                    o.notes,
                    o.created_at,
                    o.updated_at,
                    b.name as branch_name,
                    b.street as branch_street,
                    b.city as branch_city,
                    b.zipcode as branch_zipcode,
                    json_agg(
                        json_build_object(
                            'id', oi.id,
                            'product_name', p.name,
                            'variant_name', pv.name,
                            'quantity', oi.quantity,
                            'unit_price', oi.unit_price,
                            'total_price', oi.total_price,
                            'img_url', p.img_url
                        )
                    ) as items
                FROM orders o
                LEFT JOIN branches b ON o.branch_id = b.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN product_variant pv ON oi.product_variant_id = pv.id
                LEFT JOIN products p ON pv.product_id = p.id
                WHERE o.user_id = $1 
                AND o.order_status NOT IN ('completed', 'cancelled')
                GROUP BY o.id, b.name, b.street, b.city, b.zipcode
                ORDER BY o.created_at DESC
            `;

            const result = await pool.query(query, [userId]);

            res.json({
                success: true,
                orders: result.rows
            });

        } catch (error) {
            console.error('Error fetching current orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch current orders',
                error: error.message
            });
        }
    }

    // Cancel order (API) - only for pending and confirmed orders
    static async cancelOrder(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user?.id || req.session?.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            // Check if order exists and belongs to user
            const orderCheck = await pool.query(
                'SELECT id, order_status, user_id FROM orders WHERE id = $1 AND user_id = $2',
                [orderId, userId]
            );

            if (orderCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const order = orderCheck.rows[0];

            // Check if order can be cancelled (only pending or confirmed)
            if (!['pending', 'confirmed'].includes(order.order_status)) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot cancel order with status: ${order.order_status}`
                });
            }

            // Update order status to cancelled
            const updateResult = await pool.query(
                `UPDATE orders 
                 SET order_status = 'cancelled',
                     updated_at = NOW()
                 WHERE id = $1
                 RETURNING *`,
                [orderId]
            );

            res.json({
                success: true,
                message: 'Order cancelled successfully',
                order: updateResult.rows[0]
            });

        } catch (error) {
            console.error('Error cancelling order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel order',
                error: error.message
            });
        }
    }

    static async getCheckout(req, res) {
        try {
            // Get user information from session
            const userId = req.session.user.id;
            
            // Fetch user details from database
            const userResult = await pool.query(
                'SELECT first_name, last_name, email, phone FROM users WHERE id = $1',
                [userId]
            );
            
            const user = userResult.rows[0];
            const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : '';
            
            res.render("user/checkout", {
                title: "Checkout - Bean & Brew",
                page: "checkout",
                user: {
                    fullName: fullName,
                    email: user?.email || '',
                    phone: user?.phone || ''
                }
            });
        } catch (error) {
            console.error("Error rendering checkout page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Create a new order (API)
    static async createOrder(req, res) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const {
                fullName,
                email,
                phone,
                branchId,
                notes,
                items,
                subtotal,
                tax,
                discount,
                total
            } = req.body;

            // Validate required fields
            if (!fullName || !email || !phone || !branchId || !items || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
            }

            // Get user ID from session (if logged in)
            const userId = req.user?.id || null;

            // Insert order
            const orderQuery = `
                INSERT INTO orders (
                    user_id, 
                    notes, 
                    payment_method, 
                    payment_status,
                    order_status,
                    total_amount, 
                    shipping_address,
                    branch_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;

            const shippingAddress = `${fullName}\n${email}\n${phone}`;
            
            const orderResult = await client.query(orderQuery, [
                userId,
                notes || null,
                'pending', // Will be set during payment
                'pending',
                'pending', // order_status - will be updated based on payment method
                total,
                shippingAddress,
                branchId
            ]);

            const orderId = orderResult.rows[0].id;

            // Insert order items
            const itemInsertPromises = items.map(item => {
                const itemQuery = `
                    INSERT INTO order_items (
                        order_id,
                        product_variant_id,
                        quantity,
                        unit_price,
                        total_price
                    )
                    VALUES ($1, $2, $3, $4, $5)
                `;
                
                return client.query(itemQuery, [
                    orderId,
                    item.productVariantId,
                    item.quantity,
                    item.unitPrice,
                    item.totalPrice
                ]);
            });

            await Promise.all(itemInsertPromises);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Order created successfully',
                orderId: orderId
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create order',
                error: error.message
            });
        } finally {
            client.release();
        }
    }

    // Get order by ID (API)
    static async getOrder(req, res) {
        try {
            const { orderId } = req.params;

            const orderQuery = `
                SELECT 
                    o.*,
                    b.name as branch_name,
                    b.street as branch_street,
                    b.city as branch_city,
                    b.zipcode as branch_zipcode
                FROM orders o
                LEFT JOIN branches b ON o.branch_id = b.id
                WHERE o.id = $1
            `;

            const orderResult = await pool.query(orderQuery, [orderId]);

            if (orderResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const order = orderResult.rows[0];

            // Get order items with product details
            const itemsQuery = `
                SELECT 
                    oi.*,
                    p.name as product_name,
                    pv.name as variant_name
                FROM order_items oi
                LEFT JOIN product_variant pv ON oi.product_variant_id = pv.id
                LEFT JOIN products p ON pv.product_id = p.id
                WHERE oi.order_id = $1
            `;

            const itemsResult = await pool.query(itemsQuery, [orderId]);

            res.json({
                success: true,
                order: {
                    ...order,
                    items: itemsResult.rows
                }
            });

        } catch (error) {
            console.error('Error fetching order:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch order',
                error: error.message
            });
        }
    }

    // Get user orders (API)
    static async getUserOrders(req, res) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const query = `
                SELECT 
                    o.*,
                    b.name as branch_name,
                    b.city as branch_city,
                    COUNT(oi.id) as item_count
                FROM orders o
                LEFT JOIN branches b ON o.branch_id = b.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = $1
                GROUP BY o.id, b.name, b.city
                ORDER BY o.created_at DESC
            `;

            const result = await pool.query(query, [userId]);

            res.json({
                success: true,
                orders: result.rows
            });

        } catch (error) {
            console.error('Error fetching user orders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch orders',
                error: error.message
            });
        }
    }

    // Update order status (API)
    static async updateOrderStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { paymentStatus, paymentMethod } = req.body;

            const query = `
                UPDATE orders
                SET payment_status = $1,
                    payment_method = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const result = await pool.query(query, [paymentStatus, paymentMethod, orderId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            res.json({
                success: true,
                message: 'Order status updated',
                order: result.rows[0]
            });

        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update order status',
                error: error.message
            });
        }
    }

    // Legacy method - kept for backward compatibility
    static processOrder(req, res) {
        // Redirect to createOrder
        return OrderController.createOrder(req, res);
    }

    // Get all branches (public API for checkout)
    static async getBranches(req, res) {
        try {
            const result = await pool.query(
                'SELECT id, name, street, city, zipcode FROM branches ORDER BY name'
            );

            res.json({
                success: true,
                branches: result.rows
            });

        } catch (error) {
            console.error('Error fetching branches:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch branches',
                error: error.message
            });
        }
    }

    // Get payment details for an order
    static async getOrderPayment(req, res) {
        try {
            const { orderId } = req.params;

            const query = `
                SELECT *
                FROM payments
                WHERE order_id = $1
                ORDER BY payment_date DESC
                LIMIT 1
            `;

            const result = await pool.query(query, [orderId]);

            if (result.rows.length === 0) {
                return res.json({
                    success: true,
                    payment: null,
                    message: 'No payment record found'
                });
            }

            res.json({
                success: true,
                payment: result.rows[0]
            });

        } catch (error) {
            console.error('Error fetching payment details:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payment details',
                error: error.message
            });
        }
    }

    // Get notification count (pending and processing orders)
    static async getNotificationCount(req, res) {
        try {
            const userId = req.session.user.id;
            
            // Count orders with status 'pending' or 'processing'
            const result = await pool.query(
                `SELECT COUNT(*) as count 
                 FROM orders 
                 WHERE user_id = $1 
                 AND order_status IN ('pending', 'processing')`,
                [userId]
            );
            
            res.json({ 
                success: true, 
                count: parseInt(result.rows[0].count) || 0 
            });
        } catch (error) {
            console.error('Error getting notification count:', error);
            res.status(500).json({ 
                success: false, 
                count: 0 
            });
        }
    }
}

export default OrderController;