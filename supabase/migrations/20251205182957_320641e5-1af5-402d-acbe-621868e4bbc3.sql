-- Allow users to insert their own products when purchasing
CREATE POLICY "Users can create their own products" 
ON public.user_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);