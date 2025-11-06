// Menu Controller for handling menu page

class MenuController {
    static getMenu(req, res) {
        try {
            res.render("user/menu", {
                title: "Menu - Bean & Brew",
                page: "menu"
            });
        } catch (error) {
            console.error("Error rendering menu page:", error);
            res.status(500).render("error", { message: "Internal Server Error" });
        }
    }

    // Add menu items (future functionality)
    static addToCart(req, res) {
        try {
            // Implementation for adding items to cart
            res.json({ success: true, message: "Item added to cart" });
        } catch (error) {
            console.error("Error adding to cart:", error);
            res.status(500).json({ success: false, message: "Failed to add item to cart" });
        }
    }
}

export default MenuController;