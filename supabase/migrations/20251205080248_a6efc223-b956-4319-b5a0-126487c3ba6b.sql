-- Allow null product_id in recharges table for balance-only recharges
ALTER TABLE public.recharges 
ALTER COLUMN product_id DROP NOT NULL;

-- Drop the existing foreign key if it exists and re-add it with ON DELETE SET NULL
ALTER TABLE public.recharges 
DROP CONSTRAINT IF EXISTS recharges_product_id_fkey;

ALTER TABLE public.recharges 
ADD CONSTRAINT recharges_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE SET NULL;