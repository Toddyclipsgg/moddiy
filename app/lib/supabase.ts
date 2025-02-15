import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/supabase';

const supabaseUrl = 'https://qaeptudzswdfdgwxcamg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZXB0dWR6c3dkZmRnd3hjYW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk2MjIxNTMsImV4cCI6MjA1NTE5ODE1M30.rQd9YD2uUw818Lm9NObmVbTJuf09XcH77kXiBcBpHLU';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
}); 