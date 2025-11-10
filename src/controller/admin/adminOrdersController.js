// Admin Orders Management Controller
import db from '../../database/db.js';

class AdminOrdersController {
    static getOrders(req, res) {
        try {
            res.render("admin/orders", {
                title: "Order Management - Bean & Brew Admin",
                page: "admin-orders"
            });
        } catch (error) {
            console.error("Error rendering admin orders page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get all orders with customer and branch details
    static async getAllOrders(req, res) {
        try {
            console.log('[AdminOrdersController] getAllOrders called');
            
            const query = `
                SELECT 
                    o.id,
                    o.user_id,
                    o.notes,
                    o.payment_method,
                    o.payment_status,
                    o.order_status,
                    o.total_amount,
                    o.shipping_address,
                    o.branch_id,
                    o.created_at,
                    o.updated_at,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    b.name as branch_name,
                    b.street as branch_street,
                    b.city as branch_city,
                    COUNT(oi.id) as item_count
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN branches b ON o.branch_id = b.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                GROUP BY o.id, o.user_id, o.notes, o.payment_method, o.payment_status, o.order_status, 
                         o.total_amount, o.shipping_address, o.branch_id, o.created_at, o.updated_at,
                         u.first_name, u.last_name, u.email, u.phone, b.name, b.street, b.city
                ORDER BY o.created_at DESC
            `;
            
            const result = await db.query(query);
            console.log(`[AdminOrdersController] Found ${result.rows.length} orders`);
            
            // Parse shipping address for each order
            const orders = result.rows.map(order => {
                const addressLines = order.shipping_address ? order.shipping_address.split('\n') : [];
                return {
                    ...order,
                    customer_name: addressLines[0] || `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Guest',
                    customer_email: addressLines[1] || order.email || '',
                    customer_phone: addressLines[2] || order.phone || ''
                };
            });
            
            res.json({ 
                success: true, 
                orders: orders,
                count: orders.length
            });
        } catch (error) {
            console.error("[AdminOrdersController] Error fetching orders:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to fetch orders",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Get order details with items
    static async getOrderDetails(req, res) {
        try {
            const { orderId } = req.params;
            console.log(`[AdminOrdersController] Getting order details for ID: ${orderId}`);
            
            // Get order with customer and branch info
            const orderQuery = `
                SELECT 
                    o.*,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    b.name as branch_name,
                    b.street as branch_street,
                    b.city as branch_city,
                    b.zipcode as branch_zipcode
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN branches b ON o.branch_id = b.id
                WHERE o.id = $1
            `;
            
            const orderResult = await db.query(orderQuery, [orderId]);
            
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
                    p.img_url as product_image,
                    pv.name as variant_name
                FROM order_items oi
                LEFT JOIN product_variant pv ON oi.product_variant_id = pv.id
                LEFT JOIN products p ON pv.product_id = p.id
                WHERE oi.order_id = $1
            `;
            
            const itemsResult = await db.query(itemsQuery, [orderId]);
            
            // Parse shipping address
            const addressLines = order.shipping_address ? order.shipping_address.split('\n') : [];
            const orderDetails = {
                ...order,
                customer_name: addressLines[0] || `${order.first_name || ''} ${order.last_name || ''}`.trim() || 'Guest',
                customer_email: addressLines[1] || order.email || '',
                customer_phone: addressLines[2] || order.phone || '',
                items: itemsResult.rows
            };
            
            res.json({
                success: true,
                order: orderDetails
            });
        } catch (error) {
            console.error("[AdminOrdersController] Error fetching order details:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to fetch order details",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update order status
    static async updateOrderStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { order_status } = req.body;
            
            console.log(`[AdminOrdersController] Updating order ${orderId} status to: ${order_status}`);
            
            // Validate order status
            const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
            if (!validStatuses.includes(order_status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order status. Must be one of: ' + validStatuses.join(', ')
                });
            }
            
            // First, get the current order to check payment method
            const checkQuery = `SELECT payment_method FROM orders WHERE id = $1`;
            const checkResult = await db.query(checkQuery, [orderId]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            const paymentMethod = checkResult.rows[0].payment_method;
            const isCashPayment = paymentMethod && (
                paymentMethod.toLowerCase() === 'cash' || 
                paymentMethod.toLowerCase() === 'cash_on_pickup'
            );
            
            // If order is completed and payment is cash, also update payment status
            let query, params;
            if (order_status === 'completed' && isCashPayment) {
                console.log(`[AdminOrdersController] Order ${orderId} is cash payment - updating payment status to completed`);
                query = `
                    UPDATE orders
                    SET order_status = $1,
                        payment_status = 'completed',
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *
                `;
                params = [order_status, orderId];
            } else {
                query = `
                    UPDATE orders
                    SET order_status = $1,
                        updated_at = NOW()
                    WHERE id = $2
                    RETURNING *
                `;
                params = [order_status, orderId];
            }
            
            const result = await db.query(query, params);
            
            const successMessage = order_status === 'completed' && isCashPayment 
                ? "Order status updated to completed and payment marked as completed"
                : "Order status updated successfully";
            
            res.json({ 
                success: true, 
                message: successMessage,
                order: result.rows[0]
            });
        } catch (error) {
            console.error("[AdminOrdersController] Error updating order status:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to update order status",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Update order (edit order details)
    static async updateOrder(req, res) {
        try {
            const { orderId } = req.params;
            const { notes, payment_status, order_status } = req.body;
            
            console.log(`[AdminOrdersController] Updating order ${orderId}`);
            
            const query = `
                UPDATE orders
                SET notes = COALESCE($1, notes),
                    payment_status = COALESCE($2, payment_status),
                    order_status = COALESCE($3, order_status),
                    updated_at = NOW()
                WHERE id = $4
                RETURNING *
            `;
            
            const result = await db.query(query, [
                notes || null,
                payment_status || null,
                order_status || null,
                orderId
            ]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            res.json({ 
                success: true, 
                message: "Order updated successfully",
                order: result.rows[0]
            });
        } catch (error) {
            console.error("[AdminOrdersController] Error updating order:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to update order",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Cancel order (set status to cancelled)
    static async cancelOrder(req, res) {
        try {
            const { orderId } = req.params;
            console.log(`[AdminOrdersController] Cancelling order ${orderId}`);
            
            const query = `
                UPDATE orders
                SET order_status = 'cancelled',
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;
            
            const result = await db.query(query, [orderId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            
            res.json({ 
                success: true, 
                message: "Order cancelled successfully",
                order: result.rows[0]
            });
        } catch (error) {
            console.error("[AdminOrdersController] Error cancelling order:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to cancel order",
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export default AdminOrdersController;