INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('tap_game', '{"enabled": true, "target_score": 5, "duration_seconds": 10, "bomb_penalty": 1}'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = jsonb_set(
  jsonb_set(
    jsonb_set(COALESCE(public.platform_settings.setting_value,'{}'::jsonb), '{target_score}', '5'::jsonb),
    '{duration_seconds}', '10'::jsonb
  ),
  '{enabled}', 'true'::jsonb
);