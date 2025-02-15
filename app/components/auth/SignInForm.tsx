import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { authStore, signIn, updateAuthModal } from '~/lib/stores/auth';
import type { SignInCredentials } from '~/types/auth';

export default function SignInForm() {
  const { isLoading, error } = useStore(authStore);
  const [credentials, setCredentials] = useState<SignInCredentials>({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(credentials);
    if (!error) {
      updateAuthModal({ isOpen: false });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Email
          </label>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <div className="i-ph:envelope-fill w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-purple-500" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              value={credentials.email}
              onChange={handleChange}
              className={classNames(
                'w-full pl-11 pr-4 py-2.5 rounded-xl',
                'bg-white dark:bg-gray-800/50',
                'border border-gray-200 dark:border-gray-700/50',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all duration-300 ease-out',
              )}
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Password
          </label>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <div className="i-ph:lock-fill w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-purple-500" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleChange}
              className={classNames(
                'w-full pl-11 pr-4 py-2.5 rounded-xl',
                'bg-white dark:bg-gray-800/50',
                'border border-gray-200 dark:border-gray-700/50',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all duration-300 ease-out',
              )}
              placeholder="Enter your password"
              required
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={classNames(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
            'bg-purple-500 hover:bg-purple-600',
            'text-white font-medium',
            'transition-colors duration-300 ease-out',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isLoading ? (
            <>
              <div className="i-ph:spinner-gap w-5 h-5 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <div className="i-ph:sign-in w-5 h-5" />
              <span>Sign In</span>
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => updateAuthModal({ type: 'signup' })}
            className="text-purple-500 hover:text-purple-600 font-medium"
          >
            Sign up
          </button>
        </p>
      </form>
    </div>
  );
} 