-- Create referral settings table
CREATE TABLE public.referral_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_amount NUMERIC NOT NULL DEFAULT 10.00,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage referral settings
CREATE POLICY "Admins can manage referral settings"
ON public.referral_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Everyone can view if referral is enabled
CREATE POLICY "Anyone can view referral settings"
ON public.referral_settings
FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.referral_settings (bonus_amount, enabled)
VALUES (10.00, true);

-- Create trigger for updated_at
CREATE TRIGGER update_referral_settings_updated_at
BEFORE UPDATE ON public.referral_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();