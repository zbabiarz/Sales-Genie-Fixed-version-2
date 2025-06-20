import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Create client_selected_plans table
    const { error: createTableError } = await supabase.rpc("execute_sql", {
      sql: `
        -- Ensure client_selected_plans table exists
        CREATE TABLE IF NOT EXISTS client_selected_plans (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          insurance_plan_id UUID NOT NULL REFERENCES insurance_plans(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Add unique constraint if it doesn't exist
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'unique_client_plan' 
            AND conrelid = 'client_selected_plans'::regclass
          ) THEN
            ALTER TABLE client_selected_plans ADD CONSTRAINT unique_client_plan UNIQUE (client_id, insurance_plan_id);
          END IF;
        END $$;
        
        -- Enable row-level security
        ALTER TABLE client_selected_plans ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can manage their own client plans" ON client_selected_plans;
        
        -- Create policy to allow users to select plans for their own clients
        CREATE POLICY "Users can manage their own client plans"
          ON client_selected_plans
          USING (client_id IN (
            SELECT id FROM clients WHERE user_id = auth.uid()
          ));
        
        -- Add realtime support
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'client_selected_plans'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE client_selected_plans;
          END IF;
        END $$;
      `,
    });

    if (createTableError) {
      console.error("Error creating table:", createTableError);
      return NextResponse.json(
        { error: createTableError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "client_selected_plans table created successfully",
    });
  } catch (error) {
    console.error("Error in create table endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
