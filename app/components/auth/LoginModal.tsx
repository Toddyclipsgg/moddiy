import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog'
import { useAuth } from '../../../lib/AuthContext'
import { useState } from 'react'
import { toast } from 'react-toastify'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGithub } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGithubLogin = async () => {
    try {
      setIsLoading(true)
      const data = await signInWithGithub()
      console.log('GitHub auth response:', data)
      
      // Only close the modal if we're being redirected
      // The modal will be automatically closed after successful authentication
      if (!data?.url) {
        onClose()
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Failed to sign in with GitHub. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DialogRoot open={isOpen}>
      <Dialog onBackdrop={onClose} onClose={onClose}>
        <DialogTitle>Sign In</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-4 p-4">
            <p className="text-bolt-elements-textPrimary">
              Sign in to access your personalized chat history and settings.
            </p>
            <button
              onClick={handleGithubLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#24292e] hover:bg-[#1a1e22] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="inline-block i-ph:spinner-gap animate-spin" />
              ) : (
                <span className="inline-block i-ph:github-logo-thin" />
              )}
              {isLoading ? 'Connecting...' : 'Continue with GitHub'}
            </button>
          </div>
        </DialogDescription>
      </Dialog>
    </DialogRoot>
  )
}
