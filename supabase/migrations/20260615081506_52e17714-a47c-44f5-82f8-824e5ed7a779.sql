
-- 1. profiles: drop blanket public read
DROP POLICY IF EXISTS "Anyone can validate referral codes" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_user_id_by_referral_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles
  WHERE lower(referral_code) = lower(_code)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_referral_code(text) TO anon, authenticated;

-- 2. bonus_codes: restrict select to authenticated
DROP POLICY IF EXISTS "Authenticated users can view active codes" ON public.bonus_codes;
CREATE POLICY "Authenticated users can view active codes"
ON public.bonus_codes
FOR SELECT
TO authenticated
USING (is_active = true AND expires_at > now());

-- 3. referral_investments: drop public ALL policy, restrict to service_role
DROP POLICY IF EXISTS "System can manage referral investments" ON public.referral_investments;
CREATE POLICY "Service role manages referral investments"
ON public.referral_investments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. storage: drop overly permissive upload policy
DROP POLICY IF EXISTS "Allow authenticated uploads to product-images" ON storage.objects;

-- 5. transactions: tighten user INSERT
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
CREATE POLICY "Users can create their own purchase/withdrawal transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type IN ('purchase', 'withdrawal')
  AND amount <= 0
);

-- 6. SECURITY DEFINER function to claim bonus codes safely (server-side credit)
CREATE OR REPLACE FUNCTION public.claim_bonus_code(_code text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code public.bonus_codes%ROWTYPE;
  v_user uuid := auth.uid();
  v_existing_claim public.bonus_code_claims%ROWTYPE;
  v_existing_tx uuid;
  v_ratio numeric;
  v_range numeric;
  v_bonus numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_code FROM public.bonus_codes
    WHERE code = upper(_code) AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired bonus code';
  END IF;
  IF v_code.expires_at < now() THEN
    RAISE EXCEPTION 'This bonus code has expired';
  END IF;
  IF v_code.total_claims >= v_code.max_claims THEN
    RAISE EXCEPTION 'This bonus code has reached maximum claims';
  END IF;

  SELECT * INTO v_existing_claim FROM public.bonus_code_claims
    WHERE user_id = v_user AND code_id = v_code.id;

  IF FOUND THEN
    SELECT id INTO v_existing_tx FROM public.transactions
      WHERE user_id = v_user
        AND description = 'Bonus code reward: ' || v_code.code
      LIMIT 1;
    IF v_existing_tx IS NOT NULL THEN
      RAISE EXCEPTION 'You have already claimed this bonus code';
    END IF;

    INSERT INTO public.transactions(user_id, amount, type, description)
    VALUES (v_user, v_existing_claim.bonus_amount, 'referral_bonus',
            'Bonus code reward: ' || v_code.code);
    RETURN v_existing_claim.bonus_amount;
  END IF;

  v_ratio := v_code.total_claims::numeric / NULLIF(v_code.max_claims, 0)::numeric;
  v_range := v_code.max_bonus - v_code.min_bonus;
  v_bonus := v_code.max_bonus - (v_range * COALESCE(v_ratio, 0));

  INSERT INTO public.bonus_code_claims(user_id, code_id, bonus_amount)
  VALUES (v_user, v_code.id, v_bonus);

  UPDATE public.bonus_codes
    SET total_claims = total_claims + 1
    WHERE id = v_code.id;

  INSERT INTO public.transactions(user_id, amount, type, description)
  VALUES (v_user, v_bonus, 'referral_bonus',
          'Bonus code reward: ' || v_code.code);

  RETURN v_bonus;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_bonus_code(text) TO authenticated;
