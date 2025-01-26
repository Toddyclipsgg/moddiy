import { useEffect, useState } from 'react';
import { 
  supabase, 
  type AuthUser, 
  type AuthState, 
  fetchUserPlan, 
  checkIsAdmin,
  type Session 
} from '../lib/supabase';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // Busca a sessão atual
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setAuthState((prev: AuthState) => ({
        ...prev,
        session,
        loading: false,
      }));
    });

    // Escuta mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      if (session?.user) {
        const [userPlan, isAdmin] = await Promise.all([
          fetchUserPlan(session.user.id),
          checkIsAdmin(session.user.email || ''),
        ]);

        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
          plan: userPlan,
          isAdmin,
        };

        setAuthState({
          session,
          user,
          loading: false,
        });
      } else {
        setAuthState({
          session: null,
          user: null,
          loading: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return authState;
} 