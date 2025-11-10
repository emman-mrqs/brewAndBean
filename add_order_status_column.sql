-- =====================================================
-- ADD ORDER_STATUS COLUMN TO ORDERS TABLE
-- Bean & Brew Coffee Shop Database
-- =====================================================

-- Add order_status column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'pending';

-- Update existing records to have appropriate status
-- Set 'confirmed' for completed payments, 'pending' for others
UPDATE orders 
SET order_status = CASE 
    WHEN payment_status = 'completed' AND payment_method = 'paypal' THEN 'confirmed'
    WHEN payment_status = 'completed' THEN 'confirmed'
    WHEN payment_method = 'cash_on_pickup' OR payment_method = 'cash' THEN 'pending'
    ELSE 'pending'
END
WHERE order_status IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);

-- Add comment to explain the column
COMMENT ON COLUMN orders.order_status IS 'Order fulfillment status: pending, confirmed, preparing, ready, completed, cancelled';

-- Example order_status values:
-- 'pending' - Order placed but not yet confirmed (cash on pickup)
-- 'confirmed' - Payment received, order confirmed (PayPal, GCash)
-- 'preparing' - Order is being prepared
-- 'ready' - Order ready for pickup
-- 'completed' - Order fulfilled and picked up
-- 'cancelled' - Order cancelled
