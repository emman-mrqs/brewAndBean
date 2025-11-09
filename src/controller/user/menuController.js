// Menu Controller for handling menu page
import db from '../../database/db.js';

class MenuController {
    static async getMenu(req, res) {
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

    // Get all products with variants
    static async getProducts(req, res) {
        try {
            const query = `
                SELECT 
                    p.id,
                    p.name,
                    p.description,
                    p.price,
                    p.img_url,
                    p.created_at,
                    p.updated_at,
                    json_agg(
                        json_build_object(
                            'id', pv.id,
                            'name', pv.name,
                            'stock_quantity', pv.stock_quantity,
                            'created_at', pv.created_at,
                            'updated_at', pv.updated_at
                        ) ORDER BY pv.name
                    ) FILTER (WHERE pv.id IS NOT NULL) as variants
                FROM products p
                LEFT JOIN product_variant pv ON p.id = pv.product_id
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `;

            const result = await db.query(query);
            
            res.json({ 
                success: true, 
                products: result.rows 
            });
        } catch (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ 
                success: false, 
                message: "Failed to fetch products" 
            });
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