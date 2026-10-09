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
            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";

            // Enable vulnerable query ONLY for local SQLi lab
            const isLocalDatabase = [
                "localhost",
                "127.0.0.1"
            ].includes(process.env.DB_HOST);

            const redTeamMode =
                process.env.NODE_ENV === "development" &&
                process.env.SQLI_LAB_ENABLED === "true" &&
                isLocalDatabase;

            // RED TEAM: Intentionally vulnerable SQL
            // BLUE TEAM: Secure parameterized SQL
            const whereClause = redTeamMode
                ? `WHERE p.name ILIKE '%${search}%'`
                : `WHERE (
                    $1::text = ''
                    OR p.name ILIKE '%' || $1 || '%'
                )`;

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
                ${whereClause}
                GROUP BY p.id
                ORDER BY p.created_at DESC
            `;

            const result = redTeamMode
                ? await db.query(query)
                : await db.query(query, [search]);

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

    // Add menu items
    static addToCart(req, res) {
        try {
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