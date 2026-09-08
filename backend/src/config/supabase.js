const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en las variables de entorno."
  );
}

const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

module.exports = supabase;