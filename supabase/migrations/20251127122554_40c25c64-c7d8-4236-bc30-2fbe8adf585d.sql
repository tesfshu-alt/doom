-- Create withdrawal fee settings table
CREATE TABLE public.withdrawal_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_percentage NUMERIC NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_fee_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage fee settings
CREATE POLICY "Admins can manage withdrawal fee settings"
ON public.withdrawal_fee_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Anyone can view fee settings
CREATE POLICY "Anyone can view withdrawal fee settings"
ON public.withdrawal_fee_settings
FOR SELECT
USING (true);

-- Insert default settings
INSERT INTO public.withdrawal_fee_settings (fee_percentage, enabled)
VALUES (0, false);

-- Create trigger for updated_at
CREATE TRIGGER update_withdrawal_fee_settings_updated_at
BEFORE UPDATE ON public.withdrawal_fee_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();