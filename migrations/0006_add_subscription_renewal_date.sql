-- Migration to add subscription_renewal_date field
-- This separates renewal date (when next payment occurs) from end date (when subscription expires)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_renewal_date timestamp;

-- Update existing data: for active subscriptions, current subscription_end_date is actually the renewal date
UPDATE users 
SET subscription_renewal_date = subscription_end_date,
    subscription_end_date = NULL
WHERE subscription_status = 'active' 
  AND subscription_tier = 'premium'
  AND subscription_end_date IS NOT NULL;

-- For cancelled subscriptions, subscription_end_date is correct (when access actually ends)
-- so we don't update those records

-- Add comments to clarify the fields
COMMENT ON COLUMN users.subscription_renewal_date IS 'When the next billing cycle starts and payment is charged (for active subscriptions)';
COMMENT ON COLUMN users.subscription_end_date IS 'When subscription access actually expires (for cancelled subscriptions or trials)';


