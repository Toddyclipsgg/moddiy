import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { authStore, signUp, updateAuthModal } from '~/lib/stores/auth';
import type { SignUpCredentials } from '~/types/auth';
import { useNavigate } from '@remix-run/react';
import { authModalStore } from '~/lib/stores/auth';

interface PasswordValidation {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export default function SignUpForm() {
  const { isLoading, error, isGuest } = useStore(authStore);
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<SignUpCredentials>({
    email: '',
    password: '',
    username: '',
    bio: '',
    avatar: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [showPasswordValidation, setShowPasswordValidation] = useState(false);

  useEffect(() => {
    const validation: PasswordValidation = {
      hasMinLength: credentials.password.length >= 8,
      hasUpperCase: /[A-Z]/.test(credentials.password),
      hasLowerCase: /[a-z]/.test(credentials.password),
      hasNumber: /[0-9]/.test(credentials.password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(credentials.password),
    };
    setPasswordValidation(validation);
  }, [credentials.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if password meets all requirements
    const isPasswordValid = Object.values(passwordValidation).every(Boolean);
    if (!isPasswordValid) {
      setShowPasswordValidation(true);
      return;
    }

    await signUp(credentials);
    // Only navigate if sign up was successful
    if (!error) {
      updateAuthModal({ isOpen: false });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);

      // Convert the file to base64
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCredentials((prev) => ({ ...prev, avatar: base64String }));
        setIsUploading(false);
      };

      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Profile Picture (Optional)
          </label>
          <div className="flex items-start gap-4">
            <div
              className={classNames(
                'w-20 h-20 rounded-full overflow-hidden',
                'bg-gray-100 dark:bg-gray-800/50',
                'flex items-center justify-center',
                'ring-1 ring-gray-200 dark:ring-gray-700',
                'relative group',
                'transition-all duration-300 ease-out',
                'hover:ring-purple-500/30 dark:hover:ring-purple-500/30',
                'hover:shadow-lg hover:shadow-purple-500/10',
              )}
            >
              {credentials.avatar ? (
                <img
                  src={credentials.avatar}
                  alt="Profile"
                  className={classNames(
                    'w-full h-full object-cover',
                    'transition-all duration-300 ease-out',
                    'group-hover:scale-105 group-hover:brightness-90',
                  )}
                />
              ) : (
                <div className="i-ph:user-circle w-10 h-10 text-gray-400 dark:text-gray-500" />
              )}

              <label
                className={classNames(
                  'absolute inset-0',
                  'flex items-center justify-center',
                  'bg-black/0 group-hover:bg-black/40',
                  'cursor-pointer transition-all duration-300 ease-out',
                  isUploading ? 'cursor-wait' : '',
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="i-ph:spinner-gap w-6 h-6 text-white animate-spin" />
                ) : (
                  <div className="i-ph:camera-plus w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform group-hover:scale-110" />
                )}
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add a profile picture to personalize your account
              </p>
            </div>
          </div>
        </div>

        {/* Username Input */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Username
          </label>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
              <div className="i-ph:user-circle-fill w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-purple-500" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              value={credentials.username}
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
              placeholder="Choose a username"
              required
              minLength={3}
            />
          </div>
        </div>

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
              onFocus={() => setShowPasswordValidation(true)}
              className={classNames(
                'w-full pl-11 pr-4 py-2.5 rounded-xl',
                'bg-white dark:bg-gray-800/50',
                'border border-gray-200 dark:border-gray-700/50',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all duration-300 ease-out',
              )}
              placeholder="Create a password"
              required
              minLength={8}
            />
          </div>
          {showPasswordValidation && (
            <div className="mt-2 space-y-1.5">
              <p className="text-sm text-gray-600 dark:text-gray-400">Password requirements:</p>
              <ul className="space-y-1 text-sm">
                <li className={classNames(
                  'flex items-center gap-1.5',
                  passwordValidation.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  <div className={passwordValidation.hasMinLength ? 'i-ph:check-circle-fill' : 'i-ph:circle'} />
                  At least 8 characters
                </li>
                <li className={classNames(
                  'flex items-center gap-1.5',
                  passwordValidation.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  <div className={passwordValidation.hasUpperCase ? 'i-ph:check-circle-fill' : 'i-ph:circle'} />
                  One uppercase letter
                </li>
                <li className={classNames(
                  'flex items-center gap-1.5',
                  passwordValidation.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  <div className={passwordValidation.hasLowerCase ? 'i-ph:check-circle-fill' : 'i-ph:circle'} />
                  One lowercase letter
                </li>
                <li className={classNames(
                  'flex items-center gap-1.5',
                  passwordValidation.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  <div className={passwordValidation.hasNumber ? 'i-ph:check-circle-fill' : 'i-ph:circle'} />
                  One number
                </li>
                <li className={classNames(
                  'flex items-center gap-1.5',
                  passwordValidation.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                )}>
                  <div className={passwordValidation.hasSpecialChar ? 'i-ph:check-circle-fill' : 'i-ph:circle'} />
                  One special character
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Bio Input */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Bio (Optional)
          </label>
          <div className="relative group">
            <div className="absolute left-3.5 top-3">
              <div className="i-ph:text-aa w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-purple-500" />
            </div>
            <textarea
              id="bio"
              name="bio"
              value={credentials.bio}
              onChange={handleChange}
              className={classNames(
                'w-full pl-11 pr-4 py-2.5 rounded-xl',
                'bg-white dark:bg-gray-800/50',
                'border border-gray-200 dark:border-gray-700/50',
                'text-gray-900 dark:text-white',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                'transition-all duration-300 ease-out',
                'resize-none h-24',
              )}
              placeholder="Tell us about yourself"
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
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <div className="i-ph:user-plus-fill w-5 h-5" />
              <span>Create Account</span>
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => updateAuthModal({ type: 'signin' })}
            className="text-purple-500 hover:text-purple-600 font-medium"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
} 