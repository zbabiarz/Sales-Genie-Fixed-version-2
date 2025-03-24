import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_KEY") ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6d3BxaGhydGZ6amd5dGJhZHhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTY2MzQ5MiwiZXhwIjoyMDU3MjM5NDkyfQ.gX2vUc5R50inxpt8F4n0LSBRorpeRQdDmoizdtoM4cE";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create chat_messages table if it doesn't exist
    const { error: createTableError } = await supabase.rpc("execute_sql", {
      sql: `
          CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            thread_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `,
    });

    if (createTableError) throw createTableError;

    // Add indexes to chat_messages table for better performance
    const { error: createIndexesError } = await supabase.rpc("execute_sql", {
      sql: `
          CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages (user_id);
          CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx ON chat_messages (thread_id);
          CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at);
        `,
    });

    if (createIndexesError) throw createIndexesError;

    // Add openai_thread_id column to users table if it doesn't exist
    const { error: alterTableError } = await supabase.rpc("execute_sql", {
      sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_thread_id TEXT;`,
    });

    if (alterTableError) throw alterTableError;

    // Add realtime support for chat_messages
    const { error: realtimeError } = await supabase.rpc("execute_sql", {
      sql: `alter publication supabase_realtime add table chat_messages;`,
    });

    if (realtimeError) throw realtimeError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Chat history tables and indexes created successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
