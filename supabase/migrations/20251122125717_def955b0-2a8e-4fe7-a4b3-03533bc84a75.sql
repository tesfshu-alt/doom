-- Create customer service contacts table
CREATE TABLE public.customer_service_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_type TEXT NOT NULL,
  title TEXT NOT NULL,
  value TEXT NOT NULL,
  link TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_service_contacts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view active contacts
CREATE POLICY "Anyone can view active contacts"
ON public.customer_service_contacts
FOR SELECT
USING (is_active = true);

-- Policy for admins to manage contacts
CREATE POLICY "Admins can manage contacts"
ON public.customer_service_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_customer_service_contacts_updated_at
BEFORE UPDATE ON public.customer_service_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Telegram contact
INSERT INTO public.customer_service_contacts (contact_type, title, value, link)
VALUES ('telegram', 'Telegram', '@platform_support', 'https://t.me/platform_support');