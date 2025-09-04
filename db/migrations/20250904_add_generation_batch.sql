BEGIN;

-- 1) insure monetary value correct
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'voucher' AND table_name = 'campaign' AND column_name = 'amount_cents'
  ) THEN
    ALTER TABLE voucher.campaign
      ADD COLUMN amount_cents INTEGER;

    -- if exists change the type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'voucher' AND table_name = 'campaign' AND column_name = 'voucher_value'
    ) THEN
      UPDATE voucher.campaign
      SET amount_cents = ROUND(voucher_value * 100)
      WHERE amount_cents IS NULL AND voucher_value IS NOT NULL;
    END IF;

    ALTER TABLE voucher.campaign
      ALTER COLUMN amount_cents SET NOT NULL;

    -- check to verify positive value
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_amount_cents_positive'
    ) THEN
      ALTER TABLE voucher.campaign
        ADD CONSTRAINT chk_amount_cents_positive CHECK (amount_cents > 0);
    END IF;
  END IF;
END$$;

-- 2) remove old columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'voucher' AND table_name = 'campaign' AND column_name = 'voucher_value'
  ) THEN
    ALTER TABLE voucher.campaign DROP COLUMN voucher_value;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'voucher' AND table_name = 'campaign' AND column_name = 'voucher_amout'
  ) THEN
    ALTER TABLE voucher.campaign DROP COLUMN voucher_amout;
  END IF;
  -- remove old constraints
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_value_positive') THEN
    ALTER TABLE voucher.campaign DROP CONSTRAINT chk_value_positive;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_amout_positive') THEN
    ALTER TABLE voucher.campaign DROP CONSTRAINT chk_amout_positive;
  END IF;
END$$;

-- 3) Create new table for batchs of vouchers
CREATE TABLE IF NOT EXISTS voucher.generation_batch (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES voucher.campaign(id) ON DELETE CASCADE,
  requested_count  INTEGER NOT NULL CHECK (requested_count > 0),
  generated_count  INTEGER NOT NULL CHECK (generated_count >= 0),
  duration_ms      INTEGER,
  status           TEXT NOT NULL DEFAULT 'SUCCESS',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_batch_campaign_id ON voucher.generation_batch (campaign_id);
CREATE INDEX IF NOT EXISTS ix_batch_created_at   ON voucher.generation_batch (created_at DESC);

COMMIT;
