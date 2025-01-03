
-- Update test@example.com user to be a premium subscriber
UPDATE users
SET 
  subscription_status = 'active',
  subscription_tier = 'premium',
  stripe_customer_id = 'cus_test',
  stripe_subscription_id = 'sub_test',
  subscription_end_date = NOW() + INTERVAL '1 year'
WHERE email = 'test@example.com';
