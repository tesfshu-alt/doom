-- Create bonus codes table for admin-generated promotional codes
CREATE TABLE public.bonus_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_bonus NUMERIC NOT NULL DEFAULT 10.00,
  min_bonus NUMERIC NOT NULL DEFAULT 5.00,
  total_claims INTEGER NOT NULL DEFAULT 0,
  max_claims INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create bonus code claims table to track user claims
CREATE TABLE public.bonus_code_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_id UUID NOT NULL REFERENCES public.bonus_codes(id) ON DELETE CASCADE,
  bonus_amount NUMERIC NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, code_id)
);

-- Enable RLS
ALTER TABLE public.bonus_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_code_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bonus_codes
CREATE POLICY "Admins can manage bonus codes"
ON public.bonus_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Authenticated users can view active codes"
ON public.bonus_codes
FOR SELECT
USING (is_active = true AND expires_at > now());

-- RLS Policies for bonus_code_claims
CREATE POLICY "Users can view their own claims"
ON public.bonus_code_claims
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own claims"
ON public.bonus_code_claims
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all claims"
ON public.bonus_code_claims
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));