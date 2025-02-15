import { atom } from 'nanostores';
import { toast } from 'react-toastify';
import type { AuthState, SignUpCredentials, SignInCredentials, AuthUser } from '~/types/auth';
import { supabase } from '~/lib/supabase';

// Initialize with stored auth state or defaults
const storedAuth = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
const storedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

const initialState: AuthState = {
  user: storedAuth ? JSON.parse(storedAuth) : null,
  isAuthenticated: !!storedToken,
  isLoading: false,
  error: null,
  isGuest: !storedToken,
};

export const authStore = atom<AuthState>(initialState);

export type AuthModalType = 'signin' | 'signup';

interface AuthModalState {
  isOpen: boolean;
  type: AuthModalType;
}

export const authModalStore = atom<AuthModalState>({
  isOpen: false,
  type: 'signin',
});

// Função helper para atualizar o estado do modal
export const updateAuthModal = (updates: Partial<AuthModalState>) => {
  authModalStore.set({
    ...authModalStore.get(),
    ...updates,
  });
};

// Mantenha o store existente e adicione:
export const auth = atom({
  isAuthenticated: false,
  user: null,
  isGuest: false,
});

// Helper to validate email format
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Helper to validate password strength
const isValidPassword = (password: string) => {
  return password.length >= 8 && // At least 8 characters
    /[A-Z]/.test(password) && // At least one uppercase
    /[a-z]/.test(password) && // At least one lowercase
    /[0-9]/.test(password) && // At least one number
    /[^A-Za-z0-9]/.test(password); // At least one special character
};

// Helper to initialize guest user
export const initializeGuestUser = () => {
  const guestUser: AuthUser = {
    id: crypto.randomUUID(),
    email: '',
    username: 'Guest User',
    createdAt: new Date().toISOString(),
    isGuest: true,
  };

  authStore.set({
    user: guestUser,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isGuest: true,
  });

  // Store guest user data
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_user', JSON.stringify(guestUser));
  }

  return guestUser;
};

// Initialize guest user if no auth token exists
if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
  initializeGuestUser();
}

// Add function to update user data
export const updateUserData = async (updates: Partial<AuthUser>) => {
  const currentUser = authStore.get().user;
  if (!currentUser || currentUser.isGuest) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        avatar_url: updates.avatar,
        bio: updates.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id);

    if (error) throw error;

    const updatedUser = {
      ...currentUser,
      ...updates,
    };

    // Update auth store
    authStore.set({
      ...authStore.get(),
      user: updatedUser,
    });

    // Update localStorage
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
  } catch (error) {
    console.error('Error updating profile:', error);
    toast.error('Failed to update profile');
  }
};

export const signUp = async (credentials: SignUpCredentials): Promise<void> => {
  if (!isValidEmail(credentials.email)) {
    toast.error('Please enter a valid email address');
    return;
  }

  if (!isValidPassword(credentials.password)) {
    toast.error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character');
    return;
  }

  if (!credentials.username || credentials.username.length < 3) {
    toast.error('Username must be at least 3 characters');
    return;
  }

  authStore.set({ ...authStore.get(), isLoading: true, error: null });

  try {
    // First, sign up with Supabase auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          username: credentials.username,
          avatar_url: credentials.avatar,
          bio: credentials.bio,
        },
      },
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('No user data returned');

    // Then create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          username: credentials.username,
          avatar_url: credentials.avatar,
          bio: credentials.bio,
          email: credentials.email,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // If profile creation fails, we should clean up the auth user
      await supabase.auth.signOut();
      throw new Error('Failed to create profile. Please try again.');
    }

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      username: credentials.username,
      createdAt: authData.user.created_at,
      avatar: credentials.avatar,
      bio: credentials.bio,
      isGuest: false,
    };

    // Update auth store
    authStore.set({
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isGuest: false,
    });

    // Store auth token and user data
    if (authData.session) {
      localStorage.setItem('auth_token', authData.session.access_token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }

    toast.success('Account created successfully! Please check your email for verification.');
  } catch (error: any) {
    console.error('Sign up error:', error);
    authStore.set({
      ...authStore.get(),
      isLoading: false,
      error: error.message || 'Failed to create account. Please try again.',
    });
    toast.error(error.message || 'Failed to create account. Please try again.');
  }
};

export const signIn = async (credentials: SignInCredentials): Promise<void> => {
  if (!isValidEmail(credentials.email)) {
    toast.error('Please enter a valid email address');
    return;
  }

  authStore.set({ ...authStore.get(), isLoading: true, error: null });

  try {
    // Sign in with Supabase
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (signInError) throw signInError;
    if (!authData.user) throw new Error('No user data returned');

    // Get user profile from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;

    const user: AuthUser = {
      id: authData.user.id,
      email: authData.user.email!,
      username: profileData.username,
      createdAt: authData.user.created_at,
      avatar: profileData.avatar_url,
      bio: profileData.bio,
      isGuest: false,
    };

    // Update auth store
    authStore.set({
      user,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isGuest: false,
    });

    // Store auth token and user data
    if (authData.session) {
      localStorage.setItem('auth_token', authData.session.access_token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }

    toast.success('Signed in successfully!');
  } catch (error: any) {
    console.error('Sign in error:', error);
    authStore.set({
      ...authStore.get(),
      isLoading: false,
      error: error.message || 'Failed to sign in. Please check your credentials and try again.',
    });
    toast.error(error.message || 'Failed to sign in. Please check your credentials and try again.');
  }
};

export const signOut = async () => {
  try {
    // First clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('bolt_profile'); // Clear profile data too

    // Try to sign out from Supabase only if we have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }

    // Finally clear auth store and initialize guest user
    authStore.set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isGuest: true,
    });

    // Initialize guest user
    initializeGuestUser();

    toast.success('Signed out successfully');
  } catch (error: any) {
    console.error('Sign out error:', error);
    // Even if Supabase signOut fails, we still want to clear local state
    authStore.set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isGuest: true,
    });
    initializeGuestUser();
    
    // Don't show error to user since we still accomplished the main goal
    console.warn('Non-critical sign out error:', error);
  }
}; 