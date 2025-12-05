-- Add unique constraint to prevent users from buying the same product multiple times
CREATE UNIQUE INDEX IF NOT EXISTS user_products_unique_active 
ON user_products (user_id, product_id) 
WHERE is_active = true;