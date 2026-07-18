
-- Add new columns to withdrawals table for institutional management
ALTER TABLE public.withdrawals 
  ADD COLUMN IF NOT EXISTS network text DEFAULT null,
  ADD COLUMN IF NOT EXISTS withdrawal_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tx_hash text DEFAULT null,
  ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone DEFAULT null,
  ADD COLUMN IF NOT EXISTS processed_by_admin uuid DEFAULT null;

-- Rename admin_note to admin_notes for clarity (keep old column, add new)
-- We'll keep admin_note as-is since it already exists and just use it
