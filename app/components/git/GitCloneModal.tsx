import { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface GitCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => Promise<void>;
}

export function GitCloneModal({ isOpen, onClose, onConfirm }: GitCloneModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic URL validation
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    const gitUrlPattern = /^(https?:\/\/)?([\w.@:/\-~]+)(\.git)?(\/?|\#[\d\w.\-/_]+?)$/;

    if (!gitUrlPattern.test(url)) {
      setError('Invalid Git URL');
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cloning repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm rounded border border-[#424242] bg-[#1e1e1e] shadow-lg overflow-hidden">
          <div className="p-4 border-b border-[#424242] bg-[#1e1e1e]">
            <Dialog.Title className="text-base font-medium text-bolt-elements-textPrimary">
              Clone Git Repository
            </Dialog.Title>
          </div>

          <form onSubmit={handleSubmit} className="p-4 bg-[#1e1e1e]">
            <div className="space-y-2">
              <label htmlFor="gitUrl" className="block text-sm text-bolt-elements-textSecondary">
                Repository URL
              </label>
              <input
                type="text"
                id="gitUrl"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 rounded border border-[#424242] bg-[#2d2d2d] text-bolt-elements-textPrimary placeholder-bolt-elements-textSecondary/50"
                placeholder="https://github.com/username/repo.git"
                disabled={isLoading}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded border border-[#424242] bg-[#2d2d2d] text-bolt-elements-textPrimary hover:bg-[#3d3d3d]"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded border border-[#424242] bg-[#2d2d2d] text-bolt-elements-textPrimary hover:bg-[#3d3d3d]"
                disabled={isLoading}
              >
                {isLoading ? 'Cloning...' : 'Clone'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
