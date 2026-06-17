
-- Per-package daily game claim tracking
ALTER TABLE public.user_products
  ADD COLUMN IF NOT EXISTS last_income_claim_date date;

CREATE OR REPLACE FUNCTION public.claim_package_daily_income(_user_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_up public.user_products%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Africa/Addis_Ababa')::date;
  v_last date;
  v_days integer;
  v_exchange_rate numeric := 170;
  v_daily_etb numeric;
  v_reward numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_up FROM public.user_products
    WHERE id = _user_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package not found'; END IF;
  IF v_up.user_id <> v_user THEN RAISE EXCEPTION 'Not your package'; END IF;
  IF NOT v_up.is_active THEN RAISE EXCEPTION 'Package is inactive'; END IF;
  IF v_up.expiry_date < now() THEN RAISE EXCEPTION 'Package has expired'; END IF;

  SELECT * INTO v_product FROM public.products WHERE id = v_up.product_id;

  v_last := COALESCE(v_up.last_income_claim_date,
                     (v_up.purchase_date AT TIME ZONE 'Africa/Addis_Ababa')::date);

  v_days := GREATEST(0, LEAST(7, (v_today - v_last)));

  IF v_days <= 0 THEN
    RAISE EXCEPTION 'Already played today. Come back tomorrow!';
  END IF;

  SELECT COALESCE((setting_value->>'etb_to_usdt')::numeric, 170)
    INTO v_exchange_rate
    FROM public.platform_settings WHERE setting_key = 'exchange_rate';

  v_daily_etb := v_product.daily_income * v_exchange_rate;
  v_reward := v_daily_etb * v_days;

  UPDATE public.user_products
    SET last_income_claim_date = v_today
    WHERE id = v_up.id;

  INSERT INTO public.transactions(user_id, amount, type, description)
  VALUES (v_user, v_reward, 'daily_income',
          'Daily game reward from ' || v_product.name ||
          ' (' || v_days || ' day' || CASE WHEN v_days>1 THEN 's' ELSE '' END || ')');

  RETURN jsonb_build_object(
    'reward_etb', v_reward,
    'days_credited', v_days,
    'daily_etb', v_daily_etb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_package_daily_income(uuid) TO authenticated;
