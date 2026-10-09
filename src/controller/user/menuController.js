// Menu Controller for handling menu page
import db from '../../database/db.js';

class MenuController {

    // Render Menu Page
    static async getMenu(req, res) {
        try {
            res.render("user/menu", {
                title: "Menu - Bean & Brew",
                page: "menu"
            });
        } catch (error) {
            console.error("Error rendering menu page:", error);
            res.status(500).render("error", {
                message: "Internal Server Error"
            });
        }
    }

    // Get products with optional search
    static async getProducts(req, res) {
        try {
            // Get search input from URL
            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";

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
                LEFT JOIN product_variant pv
                    ON p.id = pv.product_id
                WHERE (
                    $1::text = ''
                    OR p.name ILIKE '%' || $1 || '%'
                )
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `;

            // Execute parameterized SQL query
            const result = await db.query(query, [search]);

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
            res.json({
                success: true,
                message: "Item added to cart"
            });
        } catch (error) {
            console.error("Error adding to cart:", error);

            res.status(500).json({
                success: false,
                message: "Failed to add item to cart"
            });
        }
    }
}

export default MenuController;