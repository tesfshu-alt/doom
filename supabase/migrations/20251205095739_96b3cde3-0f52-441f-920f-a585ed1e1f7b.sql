-- Add full_name column to profiles table
ALTER TABLE public.profiles ADD COLUMN full_name TEXT;

-- Update the handle_new_user function to include full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
BEGIN
  -- Find referrer by referral code if provided
  IF new.raw_user_meta_data ->> 'referred_by' IS NOT NULL THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = new.raw_user_meta_data ->> 'referred_by';
  END IF;

  INSERT INTO public.profiles (id, phone_number, referral_code, referred_by, full_name)
  VALUES (
    new.id,
    new.phone,
    public.generate_referral_code(),
    referrer_id,
    new.raw_user_meta_data ->> 'full_name'
  );

  -- If user was referred, give welcome bonus
  IF referrer_id IS NOT NULL THEN
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (new.id, 50, 'welcome_bonus', 'Welcome bonus for joining via referral');
  END IF;

  RETURN new;
END;
$$;