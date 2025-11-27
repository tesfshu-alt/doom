-- Add account type to distinguish between bank and telebirr
CREATE TYPE payment_account_type AS ENUM ('bank', 'telebirr');

ALTER TABLE admin_bank_info 
ADD COLUMN account_type payment_account_type NOT NULL DEFAULT 'bank';

-- Update bank_name to allow NULL since Telebirr won't use it
ALTER TABLE admin_bank_info 
ALTER COLUMN bank_name DROP NOT NULL;