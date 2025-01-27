import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase, type AuthState, type AuthUser, fetchUserPlan, checkIsAdmin } from '../app/lib/supabase'

const AuthContext = createContext<{
  authState: AuthState
  signInWithGithub: () => Promise<any>
  signOut: () => Promise<void>
}>({
  authState: { user: null, session: null, loading: true },
  signInWithGithub: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  const updateUserWithPlanAndAdmin = async (baseUser: any | null): Promise<AuthUser | null> => {
    if (!baseUser?.email) return null;
    
    const [plan, isAdmin] = await Promise.all([
      fetchUserPlan(baseUser.id),
      checkIsAdmin(baseUser.email)
    ]);
    
    const user: AuthUser = {
      id: baseUser.id,
      email: baseUser.email,
      user_metadata: baseUser.user_metadata,
      plan: plan,
      isAdmin: isAdmin
    };
    
    return user;
  }

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      const userWithData = await updateUserWithPlanAndAdmin(session?.user ?? null);
      setAuthState({
        user: userWithData,
        session,
        loading: false,
      })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const userWithData = await updateUserWithPlanAndAdmin(session?.user ?? null);
      setAuthState({
        user: userWithData,
        session,
        loading: false,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGithub = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      })
      
      if (error) {
        console.error('Supabase OAuth error:', error)
        throw error
      }
      
      if (!data) {
        console.error('No data returned from Supabase OAuth')
        throw new Error('Authentication failed')
      }
      
      return data
    } catch (error) {
      console.error('Error signing in with GitHub:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ authState, signInWithGithub, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
