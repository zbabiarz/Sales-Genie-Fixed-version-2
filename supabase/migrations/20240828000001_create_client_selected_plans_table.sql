-- Create client_selected_plans table to track which insurance plans are selected for each client
CREATE TABLE IF NOT EXISTS client_selected_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  insurance_plan_id UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, insurance_plan_id)
);

-- Enable row-level security
ALTER TABLE client_selected_plans ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select plans for their own clients
CREATE POLICY "Users can manage their own client plans"
  ON client_selected_plans
  USING (client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  ));

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE client_selected_plans;
