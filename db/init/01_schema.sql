-- Schema isolado
CREATE SCHEMA IF NOT EXISTS voucher;

-- Se precisar de gen_random_uuid():
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS voucher.campaign (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  prefix        TEXT NOT NULL,
  voucher_value FlOAT NOT NULL,
  voucher_amout INTEGER NOT NULL,
  currency      CHAR(3) NOT NULL,
  valid_from    TIMESTAMPTZ NOT NULL,
  valid_to      TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_value_positive CHECK (voucher_value > 0),
  CONSTRAINT chk_amout_positive CHECK (voucher_value > 0),
  CONSTRAINT chk_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_prefix CHECK (prefix ~ '^[A-Z]+$'),
  CONSTRAINT chk_valid_range CHECK (valid_from <= valid_to)
);

CREATE INDEX IF NOT EXISTS ix_campaign_prefix     ON voucher.campaign (prefix);
CREATE INDEX IF NOT EXISTS ix_campaign_created_at ON voucher.campaign (created_at DESC);

CREATE TABLE IF NOT EXISTS voucher.voucher (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID NOT NULL REFERENCES voucher.campaign(id) ON DELETE CASCADE,
  code         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_voucher_code ON voucher.voucher (code);
CREATE INDEX IF NOT EXISTS ix_voucher_campaign_id ON voucher.voucher (campaign_id);
CREATE INDEX IF NOT EXISTS ix_voucher_created_at  ON voucher.voucher (created_at DESC);

CREATE OR REPLACE FUNCTION voucher.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_set_updated_at ON voucher.campaign;
CREATE TRIGGER trg_campaign_set_updated_at
BEFORE UPDATE ON voucher.campaign
FOR EACH ROW EXECUTE FUNCTION voucher.set_updated_at();
