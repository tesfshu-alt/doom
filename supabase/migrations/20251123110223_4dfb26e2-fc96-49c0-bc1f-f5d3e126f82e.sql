-- Add transaction_id and account_name fields to recharges table
ALTER TABLE recharges 
ADD COLUMN transaction_id TEXT,
ADD COLUMN payer_account_name TEXT;

-- Make payment_proof_url nullable since we're not using it anymore
ALTER TABLE recharges 
ALTER COLUMN payment_proof_url DROP NOT NULL;