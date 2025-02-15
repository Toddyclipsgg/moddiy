import { Dialog, DialogContent, DialogOverlay } from '@radix-ui/react-dialog';
import { useStore } from '@nanostores/react';
import { authModalStore, updateAuthModal, type AuthModalType } from '~/lib/stores/auth';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';

export function AuthModal() {
  const { isOpen, type } = useStore(authModalStore);
  const isSignIn = type === 'signin';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => updateAuthModal({ isOpen: open })}>
      <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md z-50">
        <div className="bg-bolt-elements-background-depth-1 rounded-lg p-6 relative">
          <button
            onClick={() => updateAuthModal({ isOpen: false })}
            className="absolute top-4 right-4 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
            aria-label="Close"
          >
            <div className="i-ph:x w-5 h-5" />
          </button>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-center text-bolt-elements-textPrimary">
              {isSignIn ? 'Welcome Back' : 'Create Account'}
            </h2>
          </div>

          {isSignIn ? <SignInForm /> : <SignUpForm />}
        </div>
      </DialogContent>
    </Dialog>
  );
} 