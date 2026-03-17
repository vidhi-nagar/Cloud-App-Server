import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseurl = process.env.SUPABASE_URL;
const supabaseannonkey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseurl, supabaseannonkey);
