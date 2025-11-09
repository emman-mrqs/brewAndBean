// Dashboard Controller for handling user dashboard
import db from '../../database/db.js';

class DashboardController {
    static async getDashboard(req, res) {
        try {
            const user = req.session?.user;
            let userStats = {
                totalOrders: 0,
                totalPoints: 0,
                memberSince: null
            };

            // Get user statistics if user is logged in
            if (user && user.id) {
                try {
                    // Get user creation date
                    const userQuery = 'SELECT created_at FROM users WHERE id = $1';
                    const userResult = await db.query(userQuery, [user.id]);
                    
                    if (userResult.rows.length > 0) {
                        userStats.memberSince = userResult.rows[0].created_at;
                    }

                    // Get order count (you can uncomment this when you have orders table)
                    // const orderQuery = 'SELECT COUNT(*) as order_count FROM orders WHERE user_id = $1';
                    // const orderResult = await db.query(orderQuery, [user.id]);
                    // userStats.totalOrders = orderResult.rows[0]?.order_count || 0;

                    // Calculate points based on orders (placeholder logic)
                    // userStats.totalPoints = userStats.totalOrders * 25; // 25 points per order
                    
                } catch (dbError) {
                    console.log('Database query error:', dbError);
                    // Continue with default stats if database query fails
                }
            }

            res.render("user/dashboard", {
                title: "Dashboard - Bean & Brew",
                page: "dashboard",
                userStats: userStats
            });
        } catch (error) {
            console.error("Error rendering dashboard page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }
}

export default DashboardController;