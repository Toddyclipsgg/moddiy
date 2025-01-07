import { useState } from 'react';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { signIn, signUp, signInWithGoogle, signInWithGitHub, supabase } from '~/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'react-toastify';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) throw error;

      toast.success(isSignUp ? 'Account created successfully!' : 'Logged in successfully!');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      switch (provider) {
        case 'google':
          await signInWithGoogle();
          break;
        case 'github':
          await signInWithGitHub();
          break;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <DialogRoot open={isOpen} onOpenChange={onClose}>
      <Dialog className="w-[80%] max-w-[320px] bg-white dark:bg-[#1A1B1E]">
        <DialogTitle className="text-center relative">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-6 i-ph:user-circle-thin text-gray-600 dark:text-white/80" />
            <span className="text-base font-medium text-gray-900 dark:text-white">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </span>
            <div className="h-6 w-6" />
          </div>
        </DialogTitle>

        <DialogDescription>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm text-gray-600 dark:text-white/60">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <div className="h-4 w-4 i-ph:envelope-thin text-gray-400 dark:text-white/60" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-sm bg-gray-50 dark:bg-[#141517] border border-gray-200 dark:border-0 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-white/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm text-gray-600 dark:text-white/60">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <div className="h-4 w-4 i-ph:lock-thin text-gray-400 dark:text-white/60" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 text-sm bg-gray-50 dark:bg-[#141517] border border-gray-200 dark:border-0 rounded text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-white/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors bg-transparent"
                >
                  <div className={`h-4 w-4 ${showPassword ? 'i-ph:eye-slash-thin' : 'i-ph:eye-thin'}`} />
                </button>
              </div>
            </div>

            <DialogButton 
              type="primary" 
              disabled={loading}
              className="w-full h-9 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 dark:bg-[#312E81] dark:hover:bg-[#312E81]/90 text-white border-0"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 i-ph:circle-notch-thin animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </DialogButton>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#1A1B1E] px-2 text-gray-400 dark:text-white/40">OR CONTINUE WITH</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center h-10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded transition-colors"
              >
                <div className="h-5 w-5 i-ph:google-logo-thin text-gray-600 dark:text-white/80" />
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                className="flex items-center justify-center h-10 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded transition-colors"
              >
                <div className="h-5 w-5 i-ph:github-logo-thin text-gray-600 dark:text-white/80" />
              </button>
            </div>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-[#6B7280] dark:hover:text-[#9CA3AF] transition-colors bg-transparent"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </form>
        </DialogDescription>
      </Dialog>
    </DialogRoot>
  );
}
