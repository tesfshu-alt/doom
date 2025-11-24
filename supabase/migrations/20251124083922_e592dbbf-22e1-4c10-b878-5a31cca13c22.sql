-- Add welcome_bonus to transaction_type enum
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'welcome_bonus';

-- Update the handle_new_user function to add welcome bonus for referred users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_id UUID;
BEGIN
  -- Get the referrer_id from referred_by
  referrer_id := (NEW.raw_user_meta_data->>'referred_by')::UUID;
  
  -- Insert profile
  INSERT INTO public.profiles (id, phone_number, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'phone_number',
    generate_referral_code(),
    referrer_id
  );
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Add welcome bonus if user was referred
  IF referrer_id IS NOT NULL THEN
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (
      NEW.id,
      'welcome_bonus',
      50,
      'Welcome bonus for joining through referral'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;