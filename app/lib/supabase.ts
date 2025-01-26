import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gppmbcipgbuvaqprakzt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcG1iY2lwZ2J1dmFxcHJha3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYyODA5NDgsImV4cCI6MjA1MTg1Njk0OH0.5w74G4Dqx9eeWufJV1ZmUABmLgAacr7wjenGjUmAGT4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type PlanType = 'free' | 'pro' | 'team' | 'enterprise';

// Interface para a sessão do Supabase
export interface Session {
  user: {
    id: string;
    email?: string;
    user_metadata: {
      avatar_url?: string;
      full_name?: string;
    };
  };
  // Adicione outros campos necessários da sessão aqui
}

export interface UserPlan {
  id: string;
  user_id: string;
  plan_type: PlanType;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
  plan: UserPlan | null;
  isAdmin: boolean;
}

export type AuthState = {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
}

// New interface for plan limits
export interface PlanLimits {
  plan_type: PlanType;
  daily_tokens: number;
}

// Function to fetch user's plan
export async function fetchUserPlan(userId: string): Promise<UserPlan | null> {
  try {
    // First, check if user_plans table exists and create it if not
    const { error: tableCheckError } = await supabase
      .from('user_plans')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes('relation "user_plans" does not exist')) {
      // Create the table via RPC
      await supabase.rpc('setup_admin_user', { admin_email: 'toddyprooo@gmail.com' });
    }

    // Now fetch the active plan
    const { data, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching user plan:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchUserPlan:', error);
    return null;
  }
}

// Function to fetch plan limits
export async function fetchPlanLimits(planType: PlanType): Promise<PlanLimits | null> {
  try {
    // First, check if plan_limits table exists
    const { error: tableCheckError } = await supabase
      .from('plan_limits')
      .select('plan_type')
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes('relation "plan_limits" does not exist')) {
      // Create the table via RPC
      await supabase.rpc('setup_plan_limits');
    }

    // Now fetch the plan limits
    const { data, error } = await supabase
      .from('plan_limits')
      .select('*')
      .eq('plan_type', planType)
      .single();

    if (error) {
      console.error('Error fetching plan limits:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchPlanLimits:', error);
    return null;
  }
}

// Function to check if user is admin
export async function checkIsAdmin(email: string): Promise<boolean> {
  try {
    // First, check if admin_users table exists
    const { error: tableCheckError } = await supabase
      .from('admin_users')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes('relation "admin_users" does not exist')) {
      // Create the table via RPC
      await supabase.rpc('setup_admin_user', { admin_email: email });
      return true; // Initial admin will be the one creating the table
    }

    // Now check if user is admin
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkIsAdmin:', error);
    return false;
  }
} 