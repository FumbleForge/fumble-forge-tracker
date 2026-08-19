import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sftvzgsykavfxsvnhugk.supabase.co";
const supabaseAnonKey = "sb_publishable__16BIlUywo3pCCvWc1D8EA_Rrtj0omD";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
