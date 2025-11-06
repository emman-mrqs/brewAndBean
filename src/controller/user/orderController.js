// Order Controller for handling order-related pages

class OrderController {
    static getOrderHistory(req, res) {
        try {
            res.render("user/orderHistory", {
                title: "Order History - Bean & Brew",
                page: "orderHistory"
            });
        } catch (error) {
            console.error("Error rendering order history page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    static getOrderPreview(req, res) {
        try {
            res.render("user/orderPreview", {
                title: "Order Preview - Bean & Brew",
                page: "orderPreview"
            });
        } catch (error) {
            console.error("Error rendering order preview page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    static getCheckout(req, res) {
        try {
            res.render("user/checkout", {
                title: "Checkout - Bean & Brew",
                page: "checkout"
            });
        } catch (error) {
            console.error("Error rendering checkout page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Process order
    static processOrder(req, res) {
        try {
            // Implementation for processing orders
            res.json({ success: true, message: "Order processed successfully" });
        } catch (error) {
            console.error("Error processing order:", error);
            res.status(500).json({ success: false, message: "Failed to process order" });
        }
    }
}

export default OrderController;