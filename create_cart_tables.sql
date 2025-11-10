-- Create cart table
CREATE TABLE IF NOT EXISTS cart (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    variant_id BIGINT,
    quantity BIGINT NOT NULL DEFAULT 1,
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variant(id) ON DELETE CASCADE,
    CONSTRAINT unique_cart_product_variant UNIQUE (cart_id, product_id, variant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);
