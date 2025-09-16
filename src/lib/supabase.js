// src/lib/supabase.js - Fixed Configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    // FIXED: Add flowType for better session handling
    flowType: 'pkce'
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    }
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
  console.log('[Supabase Auth]', event, session?.user?.id || 'No session');
  
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