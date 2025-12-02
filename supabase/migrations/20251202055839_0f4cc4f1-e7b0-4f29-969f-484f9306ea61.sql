-- Add user_type column to recharges to track promoter/investor category
ALTER TABLE public.recharges ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('promoter', 'investor'));

-- Create platform_settings table for admin-configurable welcome popup content
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read platform settings
CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings
FOR SELECT
USING (true);

-- Only admins can manage platform settings
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default welcome popup content
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('welcome_popup', jsonb_build_object(
  'enabled', true,
  'title', 'Welcome to EthioMax',
  'minimum_withdrawal', 300,
  'packages_info', 'View our investment packages to start earning daily income.'
))
ON CONFLICT (setting_key) DO NOTHING;

-- Add trigger to update updated_at on platform_settings
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create referral_investments table to track investment amounts for referral bonus eligibility
CREATE TABLE IF NOT EXISTS public.referral_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  referred_by UUID NOT NULL,
  total_invested NUMERIC DEFAULT 0,
  bonus_credited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, referred_by)
);

-- Enable RLS on referral_investments
ALTER TABLE public.referral_investments ENABLE ROW LEVEL SECURITY;

-- Users can view their referral investments
CREATE POLICY "Users can view their referral investments"
ON public.referral_investments
FOR SELECT
USING (auth.uid() = referred_by OR auth.uid() = user_id);

-- Admins can view all referral investments
CREATE POLICY "Admins can view all referral investments"
ON public.referral_investments
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- System can insert and update referral investments
CREATE POLICY "System can manage referral investments"
ON public.referral_investments
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger to update updated_at on referral_investments
CREATE TRIGGER update_referral_investments_updated_at
BEFORE UPDATE ON public.referral_investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();