// Payment Controller for handling payment functionality
import pool from '../../database/db.js';
import checkoutNodeJssdk from '@paypal/checkout-server-sdk';
import paypalClient from '../../config/paypal.js';

class PaymentController {
    // Render payment checkout page (for completing order payment)
    static getPaymentCheckout(req, res) {
        try {
            // No longer checking for orderId - order data comes from localStorage
            res.render("user/paymentCheckout", {
                title: "Payment - Bean & Brew",
                page: "checkout",
                paypalClientId: process.env.PAYPAL_CLIENT_ID
            });
        } catch (error) {
            console.error("Error rendering payment checkout page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Process payment
    static async processPayment(req, res) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            const { orderId, paymentMethod, amount, cardDetails } = req.body;

            // Validate required fields
            if (!orderId || !paymentMethod || !amount) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    success: false, 
                    message: "Missing required payment information" 
                });
            }

            // Here you would integrate with actual payment gateways
            // For now, we'll simulate the payment process
            
            let paymentResult = {
                success: true,
                transactionId: `TXN${Date.now()}`,
                paymentMethod: paymentMethod
            };

            let paymentStatus = 'pending';
            let orderStatus = 'pending'; // Default order status
            let transactionId = paymentResult.transactionId;

            // Handle different payment methods
            switch (paymentMethod) {
                case 'gcash':
                    // In production, redirect to GCash API
                    paymentResult.paymentUrl = `https://gcash.example.com/pay?ref=${orderId}`;
                    paymentStatus = 'pending';
                    orderStatus = 'pending';
                    break;
                    
                case 'paypal':
                    // In production, redirect to PayPal API
                    paymentResult.paymentUrl = `https://paypal.com/checkout?ref=${orderId}`;
                    paymentStatus = 'pending';
                    orderStatus = 'pending';
                    break;
                    
                case 'card':
                    // In production, process card payment through payment gateway
                    // Validate card details
                    if (!cardDetails || !cardDetails.number || !cardDetails.expiry || !cardDetails.cvv) {
                        await client.query('ROLLBACK');
                        return res.status(400).json({ 
                            success: false, 
                            message: "Invalid card details" 
                        });
                    }
                    // Process card payment (simulated)
                    paymentResult.success = true;
                    paymentStatus = 'completed';
                    orderStatus = 'confirmed'; // Card payment confirmed
                    break;
                    
                case 'cash_on_pickup':
                case 'cash':
                    // No payment processing needed, just mark as pending
                    paymentResult.success = true;
                    paymentStatus = 'pending';
                    orderStatus = 'pending'; // Cash on pickup remains pending until paid
                    break;
                    
                default:
                    await client.query('ROLLBACK');
                    return res.status(400).json({ 
                        success: false, 
                        message: "Invalid payment method" 
                    });
            }

            // Insert payment record into payments table
            const insertPaymentQuery = `
                INSERT INTO payments (
                    order_id,
                    payment_method,
                    payment_status,
                    transaction_id,
                    amount_paid,
                    payment_date
                )
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id
            `;

            const paymentInsertResult = await client.query(insertPaymentQuery, [
                orderId,
                paymentMethod,
                paymentStatus,
                transactionId,
                amount
            ]);

            const paymentId = paymentInsertResult.rows[0].id;

            // Update order with payment method and status
            const updateOrderQuery = `
                UPDATE orders
                SET payment_method = $1,
                    payment_status = $2,
                    order_status = $3,
                    updated_at = NOW()
                WHERE id = $4
                RETURNING user_id
            `;

            const orderUpdateResult = await client.query(updateOrderQuery, [
                paymentMethod,
                paymentStatus,
                orderStatus,
                orderId
            ]);

            const userId = orderUpdateResult.rows[0]?.user_id;

            // Get order items to decrease stock
            const getOrderItemsQuery = `
                SELECT product_variant_id, quantity
                FROM order_items
                WHERE order_id = $1
            `;

            const orderItemsResult = await client.query(getOrderItemsQuery, [orderId]);
            console.log('Order items to process:', orderItemsResult.rows);

            // Decrease product variant stock for each item
            for (const item of orderItemsResult.rows) {
                // First check current stock
                const checkStockQuery = `
                    SELECT id, stock_quantity 
                    FROM product_variant 
                    WHERE id = $1
                `;
                const stockCheck = await client.query(checkStockQuery, [item.product_variant_id]);
                console.log(`Product variant ${item.product_variant_id} - Current stock: ${stockCheck.rows[0]?.stock_quantity}, Requested: ${item.quantity}`);

                const decreaseStockQuery = `
                    UPDATE product_variant
                    SET stock_quantity = stock_quantity - $1,
                        updated_at = NOW()
                    WHERE id = $2 AND stock_quantity >= $1
                    RETURNING id, stock_quantity
                `;

                const stockUpdateResult = await client.query(decreaseStockQuery, [
                    item.quantity,
                    item.product_variant_id
                ]);

                console.log('Stock update result:', stockUpdateResult.rows);

                // Check if stock was updated (if not, product is out of stock)
                if (stockUpdateResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    const variantInfo = stockCheck.rows[0];
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for product variant ID ${item.product_variant_id}. Available: ${variantInfo?.stock_quantity || 0}, Required: ${item.quantity}`
                    });
                }
            }

            // Clear user's cart if user is logged in
            if (userId) {
                // Delete all cart items for this user
                const deleteCartItemsQuery = `
                    DELETE FROM cart_items
                    WHERE cart_id IN (
                        SELECT id FROM cart WHERE user_id = $1
                    )
                `;
                await client.query(deleteCartItemsQuery, [userId]);

                // Optionally, delete the cart itself or just leave it empty
                // const deleteCartQuery = `DELETE FROM cart WHERE user_id = $1`;
                // await client.query(deleteCartQuery, [userId]);
            }

            await client.query('COMMIT');

            // Add payment ID to result
            paymentResult.paymentId = paymentId;

            res.json(paymentResult);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Error processing payment:", error);
            res.status(500).json({ 
                success: false, 
                message: "Payment processing failed",
                error: error.message
            });
        } finally {
            client.release();
        }
    }

    /* ============================================
       PAYPAL INTEGRATION METHODS
       ============================================ */

    /**
     * Create PayPal Order
     * This is called when user clicks "Pay with PayPal"
     * Order data is stored in session, NOT in database yet
     */
    static async createPayPalOrder(req, res) {
        try {
            const { orderData } = req.body;

            // Validate order data
            if (!orderData || !orderData.items || !orderData.total) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order data'
                });
            }

            // Store order data in session (NOT in database yet)
            req.session.pendingOrder = orderData;

            // Create PayPal order request
            const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
            request.prefer("return=representation");
            request.requestBody({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'PHP',
                        value: orderData.total.toFixed(2),
                        breakdown: {
                            item_total: {
                                currency_code: 'PHP',
                                value: orderData.subtotal.toFixed(2)
                            },
                            tax_total: {
                                currency_code: 'PHP',
                                value: orderData.tax.toFixed(2)
                            }
                        }
                    },
                    description: `Bean & Brew - Order`,
                    items: orderData.items.map(item => ({
                        name: item.name,
                        unit_amount: {
                            currency_code: 'PHP',
                            value: item.unitPrice.toFixed(2)
                        },
                        quantity: item.quantity.toString(),
                        description: item.variant || 'Product'
                    }))
                }],
                application_context: {
                    brand_name: 'Bean & Brew',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'PAY_NOW',
                    return_url: `${process.env.APP_URL}/api/paypal/success`,
                    cancel_url: `${process.env.APP_URL}/api/paypal/cancel`
                }
            });

            // Execute PayPal request
            const order = await paypalClient().execute(request);

            // Return PayPal order ID to frontend
            res.json({
                success: true,
                orderId: order.result.id
            });

        } catch (error) {
            console.error('PayPal order creation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create PayPal order',
                error: error.message
            });
        }
    }

    /**
     * Capture PayPal Payment
     * This is called after user approves payment on PayPal
     * Only AFTER successful payment, we insert into database
     */
    static async capturePayPalPayment(req, res) {
        const client = await pool.connect();
        
        try {
            const { orderID } = req.body;

            if (!orderID) {
                return res.status(400).json({
                    success: false,
                    message: 'PayPal Order ID is required'
                });
            }

            // Capture the payment
            const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderID);
            request.requestBody({});

            const capture = await paypalClient().execute(request);

            // Check if payment was successful
            if (capture.result.status !== 'COMPLETED') {
                return res.status(400).json({
                    success: false,
                    message: 'Payment not completed'
                });
            }

            // Get pending order from session
            const orderData = req.session.pendingOrder;
            
            if (!orderData) {
                return res.status(400).json({
                    success: false,
                    message: 'No pending order found'
                });
            }

            // Start database transaction - NOW we insert into DB
            await client.query('BEGIN');

            const userId = req.session.user?.id;

            // Insert order into database
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

            const shippingAddress = `${orderData.fullName}\n${orderData.email}\n${orderData.phone}`;
            
            const orderResult = await client.query(orderQuery, [
                userId,
                orderData.notes || null,
                'paypal',
                'completed', // Payment already completed via PayPal
                'confirmed', // PayPal payment = confirmed order status
                orderData.total,
                shippingAddress,
                orderData.branchId
            ]);

            const dbOrderId = orderResult.rows[0].id;

            // Insert order items
            const itemInsertPromises = orderData.items.map(item => {
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
                    dbOrderId,
                    item.productVariantId,
                    item.quantity,
                    item.unitPrice,
                    item.totalPrice
                ]);
            });

            await Promise.all(itemInsertPromises);

            // Insert payment record
            const transactionId = capture.result.id;
            const payerEmail = capture.result.payer.email_address;

            const insertPaymentQuery = `
                INSERT INTO payments (
                    order_id,
                    payment_method,
                    payment_status,
                    transaction_id,
                    amount_paid,
                    payment_date
                )
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id
            `;

            await client.query(insertPaymentQuery, [
                dbOrderId,
                'paypal',
                'completed',
                transactionId,
                orderData.total
            ]);

            // Decrease product stock
            for (const item of orderData.items) {
                const checkStockQuery = `
                    SELECT id, stock_quantity 
                    FROM product_variant 
                    WHERE id = $1
                `;
                const stockCheck = await client.query(checkStockQuery, [item.productVariantId]);

                const decreaseStockQuery = `
                    UPDATE product_variant
                    SET stock_quantity = stock_quantity - $1,
                        updated_at = NOW()
                    WHERE id = $2 AND stock_quantity >= $1
                    RETURNING id, stock_quantity
                `;

                const stockUpdateResult = await client.query(decreaseStockQuery, [
                    item.quantity,
                    item.productVariantId
                ]);

                if (stockUpdateResult.rowCount === 0) {
                    await client.query('ROLLBACK');
                    const variantInfo = stockCheck.rows[0];
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for product variant ID ${item.productVariantId}`
                    });
                }
            }

            // Clear user's cart if user is logged in
            if (userId) {
                const deleteCartItemsQuery = `
                    DELETE FROM cart_items
                    WHERE cart_id IN (
                        SELECT id FROM cart WHERE user_id = $1
                    )
                `;
                await client.query(deleteCartItemsQuery, [userId]);
            }

            await client.query('COMMIT');

            // Clear pending order from session
            delete req.session.pendingOrder;

            res.json({
                success: true,
                message: 'Payment completed successfully',
                orderId: dbOrderId,
                transactionId: transactionId
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('PayPal capture error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to capture payment',
                error: error.message
            });
        } finally {
            client.release();
        }
    }

    /**
     * PayPal Success Callback
     * Called when user is redirected back from PayPal after successful payment
     */
    static async paypalSuccess(req, res) {
        try {
            const { token } = req.query;
            
            // Redirect to order confirmation page
            res.redirect(`/order-confirmation?paypal=success&token=${token}`);
        } catch (error) {
            console.error('PayPal success callback error:', error);
            res.redirect('/checkout?error=payment_failed');
        }
    }

    /**
     * PayPal Cancel Callback
     * Called when user cancels payment on PayPal
     */
    static async paypalCancel(req, res) {
        try {
            // Clear pending order from session
            if (req.session.pendingOrder) {
                delete req.session.pendingOrder;
            }
            
            // Redirect back to checkout with error message
            res.redirect('/checkout?error=payment_cancelled');
        } catch (error) {
            console.error('PayPal cancel callback error:', error);
            res.redirect('/checkout');
        }
    }
}

export default PaymentController;