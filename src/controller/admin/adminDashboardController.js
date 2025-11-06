// Admin Dashboard Controller

class AdminDashboardController {
    static getDashboard(req, res) {
        try {
            res.render("admin/dashboard", {
                title: "Admin Dashboard - Bean & Brew",
                page: "admin-dashboard"
            });
        } catch (error) {
            console.error("Error rendering admin dashboard:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Get dashboard analytics data
    static getDashboardData(req, res) {
        try {
            // Implementation for dashboard analytics
            const dashboardData = {
                totalOrders: 150,
                totalUsers: 75,
                totalRevenue: 12450.50,
                pendingOrders: 8
            };
            res.json({ success: true, data: dashboardData });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
        }
    }
}

export default AdminDashboardController;