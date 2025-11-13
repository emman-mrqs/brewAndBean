// controller/admin/adminDashboardController.js
import pool from '../../database/db.js'; // your DB pool

/**
 * Admin Dashboard Controller (robust to missing optional tables like product_images)
 */
class AdminDashboardController {
  // helper to check if a table exists in the current search_path
  static async tableExists(tableName) {
    try {
      const q = `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_name = $1
            AND table_schema NOT IN ('pg_catalog','information_schema')
        ) AS exists
      `;
      const { rows } = await pool.query(q, [tableName]);
      return rows?.[0]?.exists === true;
    } catch (err) {
      console.warn('tableExists check failed for', tableName, err?.message ?? err);
      return false;
    }
  }

  // Render dashboard page (server-rendered initial values)
  static async getDashboard(req, res) {
    try {
      // check optional tables
      const hasProductImages = await AdminDashboardController.tableExists('product_images');

      // build queries; product_images count only if table exists
      const queries = [
        pool.query(`SELECT COUNT(*)::int AS total_orders FROM orders`),
        pool.query(`SELECT COALESCE(SUM(amount_paid),0)::numeric(14,2) AS total_revenue FROM payments`),
        pool.query(`SELECT COUNT(*)::int AS total_products FROM products`),
        pool.query(`SELECT COUNT(*)::int AS total_variants FROM product_variant`),
        // placeholder for images query (may be null)
        hasProductImages ? pool.query(`SELECT COUNT(*)::int AS total_images FROM product_images`) : Promise.resolve({ rows: [{ total_images: 0 }] }),
        pool.query(`SELECT COUNT(*)::int AS total_users FROM users`),
        pool.query(`SELECT COUNT(*)::int AS low_stock_count FROM product_variant WHERE stock_quantity <= 5`),
        pool.query(`
          SELECT p.id AS product_id,
                 p.name AS product_name,
                 pv.id AS variant_id,
                 pv.name AS variant_name,
                 pv.stock_quantity AS stock,
                 COALESCE(p.price, 0)::numeric(14,2) AS price
          FROM product_variant pv
          JOIN products p ON pv.product_id = p.id
          WHERE pv.stock_quantity <= 5
          ORDER BY pv.stock_quantity ASC, p.name ASC
          LIMIT 8
        `)
      ];

      const [
        totalOrdersRes,
        totalRevenueRes,
        totalProductsRes,
        totalVariantsRes,
        totalImagesRes,
        totalUsersRes,
        lowStockCountRes,
        lowStockRowsRes
      ] = await Promise.all(queries);

      const stats = {
        totalOrders: Number(totalOrdersRes.rows?.[0]?.total_orders) || 0,
        totalRevenue: Number(totalRevenueRes.rows?.[0]?.total_revenue) || 0,
        totalProducts: Number(totalProductsRes.rows?.[0]?.total_products) || 0,
        totalVariants: Number(totalVariantsRes.rows?.[0]?.total_variants) || 0,
        totalImages: Number(totalImagesRes.rows?.[0]?.total_images) || 0,
        totalUsers: Number(totalUsersRes.rows?.[0]?.total_users) || 0,
        lowStockCount: Number(lowStockCountRes.rows?.[0]?.low_stock_count) || 0
      };

      const lowStockProducts = lowStockRowsRes.rows || [];

      return res.render("admin/dashboard", {
        title: "Admin Dashboard - Bean & Brew",
        page: "admin-dashboard",
        stats,
        lowStockProducts
      });
    } catch (error) {
      console.error("Error rendering admin dashboard:", error);

      // Try to render an error view; fallback to plain text if it doesn't exist
      try {
        return res.status(500).render("error", { message: "Internal Server Error" });
      } catch (renderErr) {
        return res.status(500).send(
          `<h1>Internal Server Error</h1><pre style="white-space:pre-wrap;">${(error && error.message) ? error.message : String(error)}</pre>`
        );
      }
    }
  }

  // JSON endpoint used by front-end for live updates
  static async getDashboardData(req, res) {
    try {
      const hasProductImages = await AdminDashboardController.tableExists('product_images');

      const queries = [
        pool.query(`SELECT COUNT(*)::int AS total_orders FROM orders`),
        pool.query(`SELECT COALESCE(SUM(amount_paid),0)::numeric(14,2) AS total_revenue FROM payments`),
        pool.query(`SELECT COUNT(*)::int AS total_products FROM products`),
        pool.query(`SELECT COUNT(*)::int AS total_variants FROM product_variant`),
        hasProductImages ? pool.query(`SELECT COUNT(*)::int AS total_images FROM product_images`) : Promise.resolve({ rows: [{ total_images: 0 }] }),
        pool.query(`SELECT COUNT(*)::int AS total_users FROM users`),
        pool.query(`SELECT COUNT(*)::int AS pending_orders FROM orders WHERE order_status = 'pending'`),
        pool.query(`SELECT COUNT(*)::int AS low_stock_count FROM product_variant WHERE stock_quantity <= 5`),
        pool.query(`
          SELECT p.id AS product_id,
                 p.name AS product_name,
                 pv.id AS variant_id,
                 pv.name AS variant_name,
                 pv.stock_quantity AS stock,
                 COALESCE(p.price, 0)::numeric(14,2) AS price
          FROM product_variant pv
          JOIN products p ON pv.product_id = p.id
          WHERE pv.stock_quantity <= 5
          ORDER BY pv.stock_quantity ASC, p.name ASC
          LIMIT 8
        `)
      ];

      const [
        totalOrdersRes,
        totalRevenueRes,
        totalProductsRes,
        totalVariantsRes,
        totalImagesRes,
        totalUsersRes,
        pendingOrdersRes,
        lowStockCountRes,
        lowStockRowsRes
      ] = await Promise.all(queries);

      const data = {
        totalOrders: Number(totalOrdersRes.rows[0].total_orders) || 0,
        totalRevenue: Number(totalRevenueRes.rows[0].total_revenue) || 0,
        totalProducts: Number(totalProductsRes.rows[0].total_products) || 0,
        totalVariants: Number(totalVariantsRes.rows[0].total_variants) || 0,
        totalImages: Number(totalImagesRes.rows[0].total_images) || 0,
        totalUsers: Number(totalUsersRes.rows[0].total_users) || 0,
        pendingOrders: Number(pendingOrdersRes.rows[0].pending_orders) || 0,
        lowStockCount: Number(lowStockCountRes.rows[0].low_stock_count) || 0,
        lowStockProducts: lowStockRowsRes.rows || []
      };

      return res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch dashboard data", error: (error && error.message) ? error.message : String(error) });
    }
  }
}

export default AdminDashboardController;
