-- Create accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  crn BIGINT NOT NULL,
  b2borb2c TEXT NOT NULL CHECK (b2borb2c IN ('b2b', 'b2c')),
  company_offering TEXT NOT NULL,
  sales_channels TEXT NOT NULL,
  is_online_checkout_present BOOLEAN NOT NULL DEFAULT FALSE,
  ecomm_provider TEXT[] NOT NULL DEFAULT '{}',
  psp_or_card_processor TEXT[] NOT NULL DEFAULT '{}',
  key_persons TEXT NOT NULL
);

-- Create an index on the name column for faster search
CREATE INDEX idx_accounts_name ON accounts(name);

-- Add RLS (Row Level Security) policy
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to all authenticated users
CREATE POLICY "Allow read access for authenticated users" 
  ON accounts
  FOR SELECT
  USING (true);

-- Create policy to allow insert for authenticated users
CREATE POLICY "Allow insert for authenticated users" 
  ON accounts
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow update for authenticated users
CREATE POLICY "Allow update for authenticated users" 
  ON accounts
  FOR UPDATE
  USING (true);

-- Create policy to allow delete for authenticated users
CREATE POLICY "Allow delete for authenticated users" 
  ON accounts
  FOR DELETE
  USING (true);

-- Insert sample data
INSERT INTO accounts (name, website, crn, b2borb2c, company_offering, sales_channels, is_online_checkout_present, ecomm_provider, psp_or_card_processor, key_persons)
VALUES
  ('TechCorp Inc.', 'techcorp.com', 12345678, 'b2b', 'Enterprise Software Solutions', 'Direct Sales, Partner Network', TRUE, ARRAY['shopify', 'woocommerce'], ARRAY['stripe', 'paypal'], 'John Doe (CEO), Jane Smith (CTO)'),
  ('RetailGenius', 'retailgenius.co.uk', 87654321, 'b2c', 'Retail Analytics Platform', 'Online, Retail Partners', TRUE, ARRAY['shopify'], ARRAY['stripe', 'adyen'], 'Alice Johnson (Founder), Bob Williams (COO)'),
  ('IndustrialSolutions Ltd.', 'industrialsolutions.org', 23456789, 'b2b', 'Manufacturing Equipment & Services', 'Field Sales, Trade Shows', FALSE, ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'Michael Brown (CEO), Sarah Davis (Sales Director)'),
  ('ConsumerGoods Co.', 'consumergoods.io', 34567890, 'b2c', 'Home & Kitchen Products', 'Online, Retail Stores, Marketplaces', TRUE, ARRAY['woocommerce', 'magento'], ARRAY['stripe', 'worldpay', 'square'], 'Emily Wilson (CEO), Tom Jackson (Head of Marketing)'),
  ('HealthTech Innovations', 'healthtech-innovations.com', 45678901, 'b2b', 'Healthcare Software & Devices', 'Direct Sales, Healthcare Events', TRUE, ARRAY['custom'], ARRAY['stripe', 'authorize.net'], 'David Miller (CEO), Rebecca Taylor (Medical Director)'); 