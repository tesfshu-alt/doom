
-- Daily tasks completions table
CREATE TABLE public.daily_task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Addis_Ababa')::date,
  completed_count integer NOT NULL DEFAULT 0,
  reward_claimed boolean NOT NULL DEFAULT false,
  reward_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_date)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_task_completions TO authenticated;
GRANT ALL ON public.daily_task_completions TO service_role;

ALTER TABLE public.daily_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own task completions"
  ON public.daily_task_completions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages task completions"
  ON public.daily_task_completions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_daily_task_completions_updated_at
  BEFORE UPDATE ON public.daily_task_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to complete a task (called from client). Atomic & secure.
CREATE OR REPLACE FUNCTION public.complete_daily_task()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_settings jsonb;
  v_enabled boolean;
  v_task_count integer;
  v_default_reward numeric;
  v_today date := (now() AT TIME ZONE 'Africa/Addis_Ababa')::date;
  v_row public.daily_task_completions%ROWTYPE;
  v_daily_income_usdt numeric := 0;
  v_exchange_rate numeric := 170;
  v_reward numeric := 0;
  v_just_completed boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT setting_value INTO v_settings FROM public.platform_settings
    WHERE setting_key = 'daily_tasks';

  v_enabled := COALESCE((v_settings->>'enabled')::boolean, false);
  v_task_count := COALESCE((v_settings->>'task_count')::integer, 3);
  v_default_reward := COALESCE((v_settings->>'default_reward_etb')::numeric, 0);

  IF NOT v_enabled THEN
    RAISE EXCEPTION 'Daily tasks are currently disabled';
  END IF;

  -- Lock or create today's row
  INSERT INTO public.daily_task_completions(user_id, task_date)
  VALUES (v_user, v_today)
  ON CONFLICT (user_id, task_date) DO NOTHING;

  SELECT * INTO v_row FROM public.daily_task_completions
    WHERE user_id = v_user AND task_date = v_today FOR UPDATE;

  IF v_row.reward_claimed THEN
    RAISE EXCEPTION 'You have already completed all tasks today';
  END IF;

  IF v_row.completed_count >= v_task_count THEN
    RAISE EXCEPTION 'All tasks already completed';
  END IF;

  UPDATE public.daily_task_completions
    SET completed_count = completed_count + 1
    WHERE id = v_row.id
    RETURNING * INTO v_row;

  IF v_row.completed_count >= v_task_count THEN
    -- Compute reward
    SELECT COALESCE(SUM(p.daily_income), 0) INTO v_daily_income_usdt
      FROM public.user_products up
      JOIN public.products p ON p.id = up.product_id
      WHERE up.user_id = v_user AND up.is_active = true AND up.expiry_date > now();

    SELECT COALESCE((setting_value->>'etb_to_usdt')::numeric, 170)
      INTO v_exchange_rate
      FROM public.platform_settings WHERE setting_key = 'exchange_rate';

    IF v_daily_income_usdt > 0 THEN
      v_reward := v_daily_income_usdt * v_exchange_rate;
    ELSE
      v_reward := v_default_reward;
    END IF;

    UPDATE public.daily_task_completions
      SET reward_claimed = true, reward_amount = v_reward
      WHERE id = v_row.id;

    IF v_reward > 0 THEN
      INSERT INTO public.transactions(user_id, amount, type, description)
      VALUES (v_user, v_reward, 'daily_income',
              'Daily tasks reward (' || to_char(v_today, 'YYYY-MM-DD') || ')');
    END IF;

    v_just_completed := true;
  END IF;

  RETURN jsonb_build_object(
    'completed_count', v_row.completed_count,
    'task_count', v_task_count,
    'reward_claimed', v_just_completed,
    'reward_amount', CASE WHEN v_just_completed THEN v_reward ELSE 0 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_daily_task() TO authenticated;
