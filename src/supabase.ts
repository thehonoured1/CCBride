import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tihanfpxgxqtevrvblfk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpaGFuZnB4Z3hxdGV2cnZibGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzYyMzIsImV4cCI6MjA5NTMxMjIzMn0.F036_mbpMye4a-wsegF4XIQhYzwyp85YhoGx-dcMzNY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);