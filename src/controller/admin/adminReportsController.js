// src/controller/admin/adminReportsController.js
import pool from '../../database/db.js';

class AdminReportsController {
    static async getReports(req, res) {
        try {
            res.render("admin/reports", {
                title: "Reports & Analytics - Bean & Brew Admin",
                page: "admin-reports"
            });
        } catch (error) {
            console.error("Error rendering admin reports page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get overview statistics
    static async getOverviewStats(req, res) {
        const client = await pool.connect();
        try {
            // Safe expression to normalize total_amount to numeric:
            // 1. CAST to text (in case column is numeric or text)
            // 2. regexp_replace to remove non-digits and non-dot characters
            // 3. NULLIF empty string -> NULL
            // 4. CAST to numeric
            const amountExpr = `CAST(NULLIF(regexp_replace(CAST(total_amount AS text), '[^0-9.]', '', 'g'), '') AS numeric)`;

            // Total revenue (only completed)
            const revenueResult = await client.query(`
                SELECT COALESCE(SUM(${amountExpr}), 0) as total_revenue
                FROM orders
                WHERE order_status = 'completed'
            `);

            // Total orders
            const ordersResult = await client.query(`
                SELECT COUNT(*) as total_orders
                FROM orders
            `);

            // Total customers
            const customersResult = await client.query(`
                SELECT COUNT(*) as total_customers
                FROM users
            `);

            // Total products
            const productsResult = await client.query(`
                SELECT COUNT(*) as total_products
                FROM products
            `);

            // Average order value (only completed)
            const avgOrderResult = await client.query(`
                SELECT COALESCE(AVG(${amountExpr}), 0) as avg_order_value
                FROM orders
                WHERE order_status = 'completed'
            `);

            // Orders by status
            const orderStatusResult = await client.query(`
                SELECT 
                    order_status,
                    COUNT(*) as count
                FROM orders
                GROUP BY order_status
            `);

            // release client
            client.release();

            res.json({
                success: true,
                stats: {
                    totalRevenue: parseFloat(revenueResult.rows[0].total_revenue || 0),
                    totalOrders: parseInt(ordersResult.rows[0].total_orders || 0),
                    totalCustomers: parseInt(customersResult.rows[0].total_customers || 0),
                    totalProducts: parseInt(productsResult.rows[0].total_products || 0),
                    avgOrderValue: parseFloat(avgOrderResult.rows[0].avg_order_value || 0),
                    ordersByStatus: orderStatusResult.rows
                }
            });
        } catch (error) {
            console.error("Error getting overview stats:", error);
            try { client.release(); } catch (e) {}
            res.status(500).json({ success: false, message: "Failed to get overview statistics" });
        }
    }

    // Get sales report
    static async getSalesReport(req, res) {
  const client = await pool.connect();
  try {
    const { period = '30days' } = req.query;

    // Build two date conditions:
    // - one for unaliased orders table (used in queries where orders is referenced without alias)
    // - one for aliased orders table (used when orders are referenced as "o")
    let dateCondition = '';
    switch (period) {
      case '7days':
        dateCondition = "created_at >= NOW() - INTERVAL '7 days'";
        break;
      case '30days':
        dateCondition = "created_at >= NOW() - INTERVAL '30 days'";
        break;
      case '90days':
        dateCondition = "created_at >= NOW() - INTERVAL '90 days'";
        break;
      case 'year':
        dateCondition = "created_at >= NOW() - INTERVAL '1 year'";
        break;
      default:
        dateCondition = "created_at >= NOW() - INTERVAL '30 days'";
    }

    // aliased version for queries that refer to orders as "o"
    const dateConditionAliased = dateCondition.replace(/\bcreated_at\b/g, 'o.created_at');

    // Safe amount expression (cleanup: cast to text, strip non-digits/dot, NULLIF empty, cast to numeric)
    const amountExpr = `CAST(NULLIF(regexp_replace(CAST(total_amount AS text), '[^0-9.]', '', 'g'), '') AS numeric)`;

    // 1) Daily sales data (orders referenced without alias)
    const salesData = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(${amountExpr}), 0) as revenue
      FROM orders
      WHERE order_status = 'completed' AND ${dateCondition}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // 2) Top selling products (orders referenced with alias 'o')
    // Use dateConditionAliased so we reference the aliased column correctly
    const topProducts = await client.query(`
      SELECT 
        p.name,
        pv.name as variant_name,
        SUM(oi.quantity) as total_sold,
        COALESCE(SUM(
          CASE
            WHEN oi.total_price IS NULL THEN 0
            ELSE CAST(NULLIF(regexp_replace(CAST(oi.total_price AS text), '[^0-9.]', '', 'g'), '') AS numeric)
          END
        ), 0) as revenue
      FROM order_items oi
      JOIN product_variant pv ON oi.product_variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status = 'completed' AND ${dateConditionAliased}
      GROUP BY p.id, p.name, pv.name
      ORDER BY revenue DESC
      LIMIT 10
    `);

    // 3) Payment methods breakdown (orders referenced without alias)
    const paymentMethods = await client.query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(${amountExpr}), 0) as revenue
      FROM orders
      WHERE order_status = 'completed' AND ${dateCondition}
      GROUP BY payment_method
    `);

    client.release();

    res.json({
      success: true,
      report: {
        salesData: salesData.rows,
        topProducts: topProducts.rows,
        paymentMethods: paymentMethods.rows
      }
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    try { client.release(); } catch (e) {}
    res.status(500).json({ success: false, message: 'Failed to generate sales report' });
  }
}

    // Get customer analytics
    static async getCustomerAnalytics(req, res) {
        const client = await pool.connect();
        try {
            // Users by auth provider
            const authProviders = await client.query(`
                SELECT 
                    COALESCE(auth_provider, 'local') as provider,
                    COUNT(*) as count
                FROM users
                GROUP BY auth_provider
                ORDER BY count DESC
            `);

            // New customers trend (last 12 months)
            const customerTrend = await client.query(`
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM') as month,
                    COUNT(*) as new_customers
                FROM users
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                ORDER BY month ASC
            `);

            // Verified vs unverified users
            const verificationStatus = await client.query(`
                SELECT 
                    is_verified,
                    COUNT(*) as count
                FROM users
                GROUP BY is_verified
            `);

            client.release();

            res.json({
                success: true,
                analytics: {
                    authProviders: authProviders.rows,
                    customerTrend: customerTrend.rows,
                    verificationStatus: verificationStatus.rows
                }
            });
        } catch (error) {
            console.error("Error generating customer analytics:", error);
            try { client.release(); } catch (e) {}
            res.status(500).json({ success: false, message: "Failed to generate customer analytics" });
        }
    }

    // Get inventory report
    static async getInventoryReport(req, res) {
        const client = await pool.connect();
        try {
            // Low stock products
            const lowStock = await client.query(`
                SELECT 
                    p.id,
                    p.name,
                    pv.name as variant_name,
                    pv.stock_quantity
                FROM product_variant pv
                JOIN products p ON pv.product_id = p.id
                WHERE pv.stock_quantity < 10
                ORDER BY pv.stock_quantity ASC
                LIMIT 20
            `);

            // Out of stock
            const outOfStock = await client.query(`
                SELECT 
                    p.id,
                    p.name,
                    pv.name as variant_name
                FROM product_variant pv
                JOIN products p ON pv.product_id = p.id
                WHERE pv.stock_quantity = 0
            `);

            // Product stats
            const productStats = await client.query(`
                SELECT 
                    COUNT(DISTINCT p.id) as total_products,
                    COUNT(pv.id) as total_variants,
                    SUM(pv.stock_quantity) as total_stock
                FROM products p
                LEFT JOIN product_variant pv ON pv.product_id = p.id
            `);

            // Total stock value
            const stockValue = await client.query(`
                SELECT 
                    SUM(p.price * pv.stock_quantity) as total_value
                FROM product_variant pv
                JOIN products p ON pv.product_id = p.id
            `);

            client.release();

            res.json({
                success: true,
                report: {
                    lowStock: lowStock.rows,
                    outOfStock: outOfStock.rows,
                    productStats: productStats.rows[0],
                    totalStockValue: parseFloat(stockValue.rows[0].total_value || 0)
                }
            });
        } catch (error) {
            console.error("Error generating inventory report:", error);
            try { client.release(); } catch (e) {}
            res.status(500).json({ success: false, message: "Failed to generate inventory report" });
        }
    }

    // Get branch performance
    static async getBranchPerformance(req, res) {
        const client = await pool.connect();
        try {
            const branchStats = await client.query(`
                SELECT 
                    b.id,
                    b.name,
                    b.city,
                    COUNT(o.id) as total_orders,
                    COALESCE(SUM(
                        CAST(NULLIF(regexp_replace(CAST(o.total_amount AS text), '[^0-9.]', '', 'g'), '') AS numeric)
                    ), 0) as total_revenue
                FROM branches b
                LEFT JOIN orders o ON b.id = o.branch_id AND o.order_status = 'completed'
                GROUP BY b.id, b.name, b.city
                ORDER BY total_revenue DESC
            `);

            client.release();

            res.json({
                success: true,
                performance: branchStats.rows
            });
        } catch (error) {
            console.error("Error getting branch performance:", error);
            try { client.release(); } catch (e) {}
            res.status(500).json({ success: false, message: "Failed to get branch performance" });
        }
    }
}

export default AdminReportsController;
