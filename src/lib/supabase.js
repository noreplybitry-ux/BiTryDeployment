import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Add logging to debug env variables
console.log('Supabase URL:', supabaseUrl || 'MISSING');
console.log('Supabase Anon Key:', supabaseAnonKey ? 'SET (length: ' + supabaseAnonKey.length + ')' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.length === 0) {
  throw new Error('Missing or invalid Supabase environment variables. Please check your .env file and ensure it contains valid REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY. Restart your development server after updating .env.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// FIXED: Add session change listener for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Supabase Auth]', event, session?.user?.id?.user?.id || 'No session');
  
  // Handle session expiry
  if (event === 'TOKEN_REFRESHED') {
    console.log('[Supabase Auth] Token refreshed successfully');
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('[Supabase Auth] User signed out');
  }
  
  if (event === 'SIGNED_IN') {
    console.log('[Supabase Auth] User signed in:', session?.user?.id);
  }
});