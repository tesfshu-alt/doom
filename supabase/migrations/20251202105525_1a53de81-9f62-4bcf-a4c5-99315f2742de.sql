-- Drop all existing policies on storage.objects for product-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Set owner on upload" ON storage.objects;

-- Create a simple policy that allows all authenticated users to upload
CREATE POLICY "Allow authenticated uploads to product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
);

-- Allow users to view files they own
CREATE POLICY "Users view own files in product-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (owner = auth.uid() OR owner_id = auth.uid()::text)
);

-- Allow admins to view all files
CREATE POLICY "Admins view all files in product-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);