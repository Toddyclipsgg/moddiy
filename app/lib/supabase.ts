import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zlmaecetqgmtduusjlry.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbWFlY2V0cWdtdGR1dXNqbHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5MzA3NTIsImV4cCI6MjA1MzUwNjc1Mn0.NAHjP_QN1-he-VE66Kvi6OfPMEMFRoWHA5iFgNq0IK0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type PlanType = 'free' | 'pro' | 'business' | 'enterprise';

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

// Interface para o uso de tokens
export interface TokenUsage {
  id?: string;
  user_id: string;
  tokens_used: number;
  created_at?: string;
}

// Function to fetch user's plan
export async function fetchUserPlan(userId: string): Promise<UserPlan | null> {
  try {
    // First, check if user_plans table exists and create it if not
    const { error: tableCheckError } = await supabase
      .from('user_plans')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      console.error('Table user_plans not found:', tableCheckError);
      return null;
    }

    // Now fetch the active plan
    const { data, error } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

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
export async function checkIsAdmin(email: string) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return !!data;
}

export async function getUserMaxTokens(userId: string) {
    const { data, error } = await supabase
        .from('users')
        .select('max_daily_tokens')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching max tokens:', error);
        return 0; // Retornar 0 em caso de erro
    }

    return data?.max_daily_tokens || 0;
}

// Função para atualizar o uso de tokens do usuário
export async function updateTokenUsage(userId: string, tokensUsed: number): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Primeiro, verifica se já existe um registro para hoje
    const { data: existingUsage } = await supabase
      .from('token_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', today)
      .lt('created_at', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString())
      .single();

    if (existingUsage) {
      // Atualiza o registro existente
      const { error } = await supabase
        .from('token_usage')
        .update({ tokens_used: existingUsage.tokens_used + tokensUsed })
        .eq('id', existingUsage.id);

      if (error) throw error;
    } else {
      // Cria um novo registro
      const { error } = await supabase
        .from('token_usage')
        .insert({
          user_id: userId,
          tokens_used: tokensUsed,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar uso de tokens:', error);
    return false;
  }
}

// Função para obter o uso de tokens do dia atual
export async function getCurrentDayTokenUsage(userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('token_usage')
      .select('tokens_used')
      .eq('user_id', userId)
      .gte('created_at', today)
      .lt('created_at', new Date(new Date().setDate(new Date().getDate() + 1)).toISOString())
      .single();

    if (error) throw error;
    
    return data?.tokens_used || 0;
  } catch (error) {
    console.error('Erro ao obter uso de tokens:', error);
    return 0;
  }
} 