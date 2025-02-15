export interface SignUpCredentials {
  email: string;
  password: string;
  username: string;
  bio?: string;
  avatar?: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  avatar?: string;
  bio?: string;
  isGuest?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isGuest: boolean;
} 