// Dashboard Controller for handling user dashboard

class DashboardController {
    static getDashboard(req, res) {
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
}

export default DashboardController;