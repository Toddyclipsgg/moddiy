import ignore from 'ignore';
import { useGit } from '~/lib/hooks/useGit';
import type { Message } from 'ai';
import { detectProjectCommands, createCommandsMessage } from '~/utils/projectCommands';
import { generateId } from '~/utils/fileUtils';
import { useState } from 'react';
import { GitCloneModal } from '~/components/git/GitCloneModal';

const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  '.github/**',
  '.vscode/**',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.png',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
  '**/*lock.json',
  '**/*lock.yaml',
];

const ig = ignore().add(IGNORE_PATTERNS);

interface GitCloneButtonProps {
  className?: string;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
}

export default function GitCloneButton({ importChat }: GitCloneButtonProps) {
  const { ready, gitClone, cloneProgress } = useGit();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClone = async (repoUrl: string) => {
    try {
      const { workdir, data } = await gitClone(repoUrl);

      if (importChat) {
        const filePaths = Object.keys(data).filter((filePath) => !ig.ignores(filePath));
        const textDecoder = new TextDecoder('utf-8');

        // Convert files for command detection
        const fileContents = filePaths
          .map((filePath) => {
            try {
              const { data: content, encoding } = data[filePath];
              return {
                path: filePath,
                content:
                  encoding === 'utf8' ? content : content instanceof Uint8Array ? textDecoder.decode(content) : '',
              };
            } catch (err) {
              console.error(`Error processing file ${filePath}:`, err);
              return null;
            }
          })
          .filter((f): f is NonNullable<typeof f> => f !== null);

        const commands = await detectProjectCommands(fileContents);
        const commandsMessage = createCommandsMessage(commands);

        const filesMessage: Message = {
          role: 'assistant',
          content: `Repository ${repoUrl} successfully cloned to ${workdir}
<boltArtifact id="imported-files" title="Git Cloned Files" type="bundled">
${fileContents
  .map(
    (file) =>
      `<boltAction type="file" filePath="${file.path}">
${file.content}
</boltAction>`,
  )
  .join('\n')}
</boltArtifact>`,
          id: generateId(),
          createdAt: new Date(),
        };

        const messages = [filesMessage];

        if (commandsMessage) {
          messages.push(commandsMessage);
        }

        await importChat(`Git Project: ${repoUrl.split('/').slice(-1)[0]}`, messages);
      }
    } catch (error) {
      console.error('Error during clone:', error);
      throw error;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={!ready}
        title={ready ? 'Clone a Git Repository' : 'Waiting for initialization...'}
        className="px-4 py-2 rounded border border-[#424242] bg-[#2d2d2d] text-bolt-elements-textPrimary hover:bg-[#3d3d3d] transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <span className="i-ph:git-branch" />
        {cloneProgress ? (
          <div className="flex items-center gap-2">
            <div className="h-1 w-20 bg-[#424242] rounded overflow-hidden">
              <div
                className="h-full bg-bolt-elements-accent transition-all duration-300"
                style={{ width: `${cloneProgress.progress}%` }}
              />
            </div>
            <span className="text-sm">{cloneProgress.detail}</span>
          </div>
        ) : (
          'Clone Git Repository'
        )}
      </button>

      <GitCloneModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleClone} />
    </>
  );
}
