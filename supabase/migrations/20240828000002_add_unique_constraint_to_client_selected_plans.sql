-- Add a unique constraint to prevent duplicate entries in client_selected_plans table
ALTER TABLE client_selected_plans ADD CONSTRAINT unique_client_plan UNIQUE (client_id, insurance_plan_id);

-- Enable realtime for the table
alter publication supabase_realtime add table client_selected_plans;
