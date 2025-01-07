import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, getCurrentUser } from '~/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar usuário atual
    getCurrentUser().then(({ user }) => {
      setUser(user);
      setLoading(false);
    });

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await getCurrentUser();
    setUser(user);
  }, []);

  return {
    user,
    loading,
    refreshUser,
    isAuthenticated: !!user
  };
}
