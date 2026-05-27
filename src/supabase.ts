import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// process.env looks at the hosting platform's secure vault automatically
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);