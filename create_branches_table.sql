-- Create branches table for Bean & Brew
-- This table stores all physical store locations

CREATE TABLE IF NOT EXISTS branches (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    street TEXT,
    city VARCHAR(255),
    zipcode VARCHAR(255),
    update_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_city ON branches(city);
CREATE INDEX IF NOT EXISTS idx_created_at ON branches(created_at);

-- Create trigger to auto-update update_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.update_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO branches (name, street, city, zipcode) VALUES
('Makati Central Branch', '123 Ayala Avenue, Makati City', 'Makati', '1200'),
('BGC Main Branch', '456 Bonifacio High Street', 'Taguig', '1634'),
('Quezon City Branch', '789 Katipunan Avenue', 'Quezon City', '1108'),
('Manila Downtown', '321 Taft Avenue', 'Manila', '1000');
