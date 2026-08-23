const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno."
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;