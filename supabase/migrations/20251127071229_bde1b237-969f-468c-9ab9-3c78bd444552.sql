-- Allow users to create their own transactions
CREATE POLICY "Users can create their own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);