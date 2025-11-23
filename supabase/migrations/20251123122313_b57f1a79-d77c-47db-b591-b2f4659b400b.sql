-- Allow anyone to read referral codes for validation during signup
CREATE POLICY "Anyone can validate referral codes"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);