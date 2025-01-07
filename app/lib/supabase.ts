import { createClient } from '@supabase/supabase-js';
import type { Database } from '~/types/database';

// Ensure URL has proper protocol
const getValidUrl = (url: string) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

const supabaseUrl = getValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'gppmbcipgbuvaqprakzt.supabase.co');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcG1iY2lwZ2J1dmFxcHJha3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyODA5NDgsImV4cCI6MjA1MTg1Njk0OH0.5w74G4Dqx9eeWufJV1ZmUABmLgAacr7wjenGjUmAGT4';

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        theme: 'dark'
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}`,
      scopes: 'read:user user:email'
    }
  });
  if (error) throw error;
  return data;
}

// Profile functions
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function updateProfile(userId: string, updates: {
  username?: string;
  full_name?: string;
  avatar_url?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId);
  return { data, error };
}

// Project functions
export async function createProject(project: Database['public']['Tables']['projects']['Insert']) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  return { data, error };
}

export async function updateProject(
  projectId: string,
  updates: Database['public']['Tables']['projects']['Update']
) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();
  return { data, error };
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);
  return { error };
}

export async function getProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();
  return { data, error };
}

export async function getUserProjects(userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getPublicProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });
  return { data, error };
}
