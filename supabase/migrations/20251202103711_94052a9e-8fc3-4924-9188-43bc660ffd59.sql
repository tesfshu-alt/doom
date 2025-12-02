-- Allow authenticated users to upload payment screenshots to product-images bucket
CREATE POLICY "Users can upload their own payment screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own uploaded payment screenshots
CREATE POLICY "Users can view their own payment screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all payment screenshots
CREATE POLICY "Admins can view all payment screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images' AND
  has_role(auth.uid(), 'admin'::user_role)
);