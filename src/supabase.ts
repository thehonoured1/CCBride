import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// process.env looks at the hosting platform's secure vault automatically
const supabaseUrl = 'https://tihanfpxgxqtevrvblfk.supabase.co';
const supabaseAnonKey = 'sb_publishable_dQB-70VmLwInvyK__IGD0w_Gt8_5qPA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);