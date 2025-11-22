-- Create custom types
CREATE TYPE public.user_role AS ENUM ('admin', 'user');
CREATE TYPE public.recharge_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.transaction_type AS ENUM ('recharge', 'purchase', 'referral_bonus', 'daily_income');

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  validity_days INTEGER NOT NULL,
  daily_income DECIMAL(10,2) NOT NULL,
  total_income DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Admin bank info table
CREATE TABLE public.admin_bank_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recharges table
CREATE TABLE public.recharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status recharge_status NOT NULL DEFAULT 'pending',
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- User products table
CREATE TABLE public.user_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  recharge_id UUID REFERENCES public.recharges(id) NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank accounts table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_bank_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'phone_number',
    generate_referral_code(),
    (NEW.raw_user_meta_data->>'referred_by')::UUID
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update bank_accounts updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for products
CREATE POLICY "Everyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for admin_bank_info
CREATE POLICY "Authenticated users can view active admin bank info"
  ON public.admin_bank_info FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage admin bank info"
  ON public.admin_bank_info FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for recharges
CREATE POLICY "Users can view their own recharges"
  ON public.recharges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recharges"
  ON public.recharges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all recharges"
  ON public.recharges FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update recharges"
  ON public.recharges FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_products
CREATE POLICY "Users can view their own products"
  ON public.user_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user products"
  ON public.user_products FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user products"
  ON public.user_products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bank_accounts
CREATE POLICY "Users can view their own bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own bank accounts"
  ON public.bank_accounts FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert seed data for products
INSERT INTO public.products (name, price, validity_days, daily_income, total_income, sort_order) VALUES
('Starter Package', 100.00, 30, 3.50, 105.00, 1),
('Bronze Package', 250.00, 30, 9.00, 270.00, 2),
('Silver Package', 500.00, 30, 19.00, 570.00, 3),
('Gold Package', 1000.00, 30, 40.00, 1200.00, 4),
('Platinum Package', 2500.00, 30, 105.00, 3150.00, 5),
('Diamond Package', 5000.00, 30, 220.00, 6600.00, 6),
('Elite Package', 10000.00, 30, 450.00, 13500.00, 7);

-- Insert admin bank info
INSERT INTO public.admin_bank_info (account_name, account_number, bank_name) VALUES
('Platform Admin', '1234567890', 'International Bank');