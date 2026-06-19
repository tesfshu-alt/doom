CREATE OR REPLACE FUNCTION public.claim_all_packages_daily_income(_perfect boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Africa/Addis_Ababa')::date;
  v_exchange_rate numeric := 170;
  v_total_reward numeric := 0;
  v_bonus numeric := 0;
  v_packages_credited integer := 0;
  v_total_days integer := 0;
  v_up record;
  v_last date;
  v_days integer;
  v_daily_etb numeric;
  v_reward numeric;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE((setting_value->>'etb_to_usdt')::numeric, 170)
    INTO v_exchange_rate
    FROM public.platform_settings WHERE setting_key = 'exchange_rate';

  FOR v_up IN
    SELECT up.*, p.daily_income, p.name AS pname
    FROM public.user_products up
    JOIN public.products p ON p.id = up.product_id
    WHERE up.user_id = v_user
      AND up.is_active = true
      AND up.expiry_date > now()
    FOR UPDATE OF up
  LOOP
    v_last := COALESCE(v_up.last_income_claim_date,
                       (v_up.purchase_date AT TIME ZONE 'Africa/Addis_Ababa')::date);
    v_days := GREATEST(0, LEAST(7, (v_today - v_last)));
    IF v_days <= 0 THEN CONTINUE; END IF;

    v_daily_etb := v_up.daily_income * v_exchange_rate;
    v_reward := v_daily_etb * v_days;
    v_total_reward := v_total_reward + v_reward;
    v_total_days := v_total_days + v_days;
    v_packages_credited := v_packages_credited + 1;

    UPDATE public.user_products
      SET last_income_claim_date = v_today
      WHERE id = v_up.id;

    INSERT INTO public.transactions(user_id, amount, type, description)
    VALUES (v_user, v_reward, 'daily_income',
      'Daily game reward from ' || v_up.pname ||
      ' (' || v_days || ' day' || CASE WHEN v_days>1 THEN 's' ELSE '' END || ')');
  END LOOP;

  IF v_packages_credited = 0 THEN
    RAISE EXCEPTION 'Nothing to claim. Come back tomorrow!';
  END IF;

  IF _perfect THEN
    v_bonus := round((1 + random() * 4)::numeric, 2);
    INSERT INTO public.transactions(user_id, amount, type, description)
    VALUES (v_user, v_bonus, 'daily_income', 'Perfect game bonus (no bombs)');
  END IF;

  RETURN jsonb_build_object(
    'reward_etb', v_total_reward,
    'days_credited', v_total_days,
    'packages_credited', v_packages_credited,
    'bonus_etb', v_bonus
  );
END;
$function$;