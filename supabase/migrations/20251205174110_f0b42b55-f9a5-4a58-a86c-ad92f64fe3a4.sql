-- Drop and recreate the trigger function to properly handle user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone_number text;
  v_referred_by uuid;
  v_full_name text;
  v_referral_code text;
BEGIN
  -- Extract phone_number from user metadata
  v_phone_number := new.raw_user_meta_data ->> 'phone_number';
  
  -- If phone_number is not in metadata, extract from email (format: phone@platform.local)
  IF v_phone_number IS NULL OR v_phone_number = '' THEN
    v_phone_number := split_part(new.email, '@', 1);
  END IF;
  
  -- Extract other metadata
  v_referred_by := (new.raw_user_meta_data ->> 'referred_by')::uuid;
  v_full_name := new.raw_user_meta_data ->> 'full_name';
  
  -- Generate referral code
  v_referral_code := generate_referral_code();
  
  -- Insert profile
  INSERT INTO public.profiles (id, phone_number, referral_code, referred_by, full_name)
  VALUES (new.id, v_phone_number, v_referral_code, v_referred_by, v_full_name);
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  -- Credit welcome bonus if user was referred
  IF v_referred_by IS NOT NULL THEN
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (new.id, 50, 'welcome_bonus', 'Welcome bonus for joining via referral');
  END IF;
  
  RETURN new;
END;
$$;