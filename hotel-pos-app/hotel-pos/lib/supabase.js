import { createClient } from '@supabase/supabase-js';
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const inr = (x) => '₹' + Math.round(x || 0).toLocaleString('en-IN');
export const lineTotal = (i) => i.qty * i.price * (1 + i.gst_percent / 100);
