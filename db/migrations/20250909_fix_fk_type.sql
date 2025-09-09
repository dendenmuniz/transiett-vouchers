
ALTER TABLE voucher.voucher
  ALTER COLUMN campaign_id TYPE uuid USING campaign_id::uuid;


ALTER TABLE voucher.voucher
  DROP CONSTRAINT IF EXISTS voucher_campaign_id_fkey,
  ADD CONSTRAINT voucher_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES voucher.campaign(id) ON DELETE CASCADE;
