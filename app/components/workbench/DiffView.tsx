/**
 * DiffView Component
 *
 * Exibe as diferenças entre duas versões de um arquivo usando uma visualização de diff unificada.
 *
 * Melhorias da refatoração:
 * - Reorganização completa do código em componentes menores e mais focados
 * - Adição de tipagem mais forte para melhor legibilidade e manutenção
 * - Separação de lógica de negócio e apresentação
 * - Implementação de navegação entre alterações (Alt+N, Alt+P)
 * - Adição de modo de alto contraste (Alt+H) para acessibilidade
 * - Marcadores visuais na barra de rolagem para indicar alterações
 * - Melhorias de interface para mostrar o tipo de arquivo e estatísticas
 * - Suporte a temas claro/escuro e modo responsivo
 * - Otimização de performance com memoização
 * - Adição de atalhos de teclado para melhorar a experiência do usuário
 * - Melhorias de acessibilidade (ARIA labels, navegação por teclado)
 *
 * @author toddyclipsgg
 * @version 2.0.0
 */

import { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import type { FileMap } from '~/lib/stores/files';
import type { EditorDocument } from '~/components/editor/codemirror/CodeMirrorEditor';
import { diffLines, type Change } from 'diff';
import { getHighlighter } from 'shiki';
import '~/styles/diff-view.css';
import { diffFiles, extractRelativePath } from '~/utils/diff';
import { ActionRunner } from '~/lib/runtime/action-runner';
import type { FileHistory } from '~/types/actions';
import { getLanguageFromExtension } from '~/utils/getLanguageFromExtension';
import { themeStore } from '~/lib/stores/theme';

// =============== TYPES ===============

interface CodeComparisonProps {
  beforeCode: string;
  afterCode: string;
  language: string;
  filename: string;
  lightTheme?: string;
  darkTheme?: string;
}

interface DiffBlock {
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'unchanged';
  correspondingLine?: number;
  charChanges?: Array<{
    value: string;
    type: 'added' | 'removed' | 'unchanged';
  }>;
}

interface FullscreenButtonProps {
  onClick: () => void;
  isFullscreen: boolean;
}

interface DiffStats {
  additions: number;
  deletions: number;
}

interface NavigationState {
  currentIndex: number;
  changeIndices: number[];
}

interface DiffProcessingResult {
  beforeLines: string[];
  afterLines: string[];
  hasChanges: boolean;
  lineChanges: { before: Set<number>; after: Set<number> };
  unifiedBlocks: DiffBlock[];
  isBinary: boolean;
  error?: boolean;
}

interface DiffViewProps {
  fileHistory: Record<string, FileHistory>;
  setFileHistory: React.Dispatch<React.SetStateAction<Record<string, FileHistory>>>;
  actionRunner: ActionRunner;
}

// =============== CONSTANTS ===============

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const BINARY_REGEX = /[\x00-\x08\x0E-\x1F]/;
const MAX_HISTORY_CHANGES = 100;
const MAX_VERSIONS = 10;

// =============== STYLE CONSTANTS ===============

const lineNumberStyles = 'diff-line-number';
const lineContentStyles = 'diff-line-content';
const diffPanelStyles = 'h-full overflow-auto diff-panel-content diff-panel';

const diffLineStyles = {
  added: 'diff-added',
  removed: 'diff-removed',
  unchanged: '',
};

const changeColorStyles = {
  added: 'text-green-700 dark:text-green-500 bg-green-500/10 dark:bg-green-500/20',
  removed: 'text-red-700 dark:text-red-500 bg-red-500/10 dark:bg-red-500/20',
  unchanged: 'text-bolt-elements-textPrimary',
};

// =============== UTILITY FUNCTIONS ===============

/**
 * Checks if the file content appears to be binary
 */
const isBinaryFile = (content: string): boolean => {
  return content.length > MAX_FILE_SIZE || BINARY_REGEX.test(content);
};

/**
 * Normalizes content for comparison by standardizing line endings and trimming trailing whitespace
 */
const normalizeContent = (content: string): string[] => {
  return content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd());
};

/**
 * Calculates statistics for differences between two text contents
 */
const calculateDiffStats = (beforeCode: string, afterCode: string): DiffStats => {
  const changes = diffLines(beforeCode, afterCode, {
    newlineIsToken: false,
    ignoreWhitespace: true,
    ignoreCase: false,
  });

  return changes.reduce(
    (acc: DiffStats, change: Change) => {
      if (change.added) {
        acc.additions += change.value.split('\n').length;
      }

      if (change.removed) {
        acc.deletions += change.value.split('\n').length;
      }

      return acc;
    },
    { additions: 0, deletions: 0 },
  );
};

/**
 * Process changes between two text contents and generates detailed diff information
 */
const processChanges = (beforeCode: string, afterCode: string): DiffProcessingResult => {
  try {
    if (isBinaryFile(beforeCode) || isBinaryFile(afterCode)) {
      return {
        beforeLines: [],
        afterLines: [],
        hasChanges: false,
        lineChanges: { before: new Set(), after: new Set() },
        unifiedBlocks: [],
        isBinary: true,
      };
    }

    const beforeLines = normalizeContent(beforeCode);
    const afterLines = normalizeContent(afterCode);

    // Early return if files are identical
    if (beforeLines.join('\n') === afterLines.join('\n')) {
      return {
        beforeLines,
        afterLines,
        hasChanges: false,
        lineChanges: { before: new Set(), after: new Set() },
        unifiedBlocks: [],
        isBinary: false,
      };
    }

    const lineChanges = {
      before: new Set<number>(),
      after: new Set<number>(),
    };

    const unifiedBlocks: DiffBlock[] = [];

    // Compare lines directly for more accurate diff
    let i = 0,
      j = 0;

    while (i < beforeLines.length || j < afterLines.length) {
      if (i < beforeLines.length && j < afterLines.length && beforeLines[i] === afterLines[j]) {
        // Unchanged line
        unifiedBlocks.push({
          lineNumber: j,
          content: afterLines[j],
          type: 'unchanged',
          correspondingLine: i,
        });
        i++;
        j++;
      } else {
        // Look ahead for potential matches
        let matchFound = false;
        const lookAhead = 3; // Number of lines to look ahead

        // Try to find matching lines ahead
        for (let k = 1; k <= lookAhead && i + k < beforeLines.length && j + k < afterLines.length; k++) {
          if (beforeLines[i + k] === afterLines[j]) {
            // Found match in after lines - mark lines as removed
            for (let l = 0; l < k; l++) {
              lineChanges.before.add(i + l);
              unifiedBlocks.push({
                lineNumber: i + l,
                content: beforeLines[i + l],
                type: 'removed',
                correspondingLine: j,
                charChanges: [{ value: beforeLines[i + l], type: 'removed' }],
              });
            }
            i += k;
            matchFound = true;
            break;
          } else if (beforeLines[i] === afterLines[j + k]) {
            // Found match in before lines - mark lines as added
            for (let l = 0; l < k; l++) {
              lineChanges.after.add(j + l);
              unifiedBlocks.push({
                lineNumber: j + l,
                content: afterLines[j + l],
                type: 'added',
                correspondingLine: i,
                charChanges: [{ value: afterLines[j + l], type: 'added' }],
              });
            }
            j += k;
            matchFound = true;
            break;
          }
        }

        if (!matchFound) {
          // No match found - try to find character-level changes
          if (i < beforeLines.length && j < afterLines.length) {
            const beforeLine = beforeLines[i];
            const afterLine = afterLines[j];

            // Find common prefix and suffix
            let prefixLength = 0;

            while (
              prefixLength < beforeLine.length &&
              prefixLength < afterLine.length &&
              beforeLine[prefixLength] === afterLine[prefixLength]
            ) {
              prefixLength++;
            }

            let suffixLength = 0;

            while (
              suffixLength < beforeLine.length - prefixLength &&
              suffixLength < afterLine.length - prefixLength &&
              beforeLine[beforeLine.length - 1 - suffixLength] === afterLine[afterLine.length - 1 - suffixLength]
            ) {
              suffixLength++;
            }

            const prefix = beforeLine.slice(0, prefixLength);
            const beforeMiddle = beforeLine.slice(prefixLength, beforeLine.length - suffixLength);
            const afterMiddle = afterLine.slice(prefixLength, afterLine.length - suffixLength);
            const suffix = beforeLine.slice(beforeLine.length - suffixLength);

            if (beforeMiddle || afterMiddle) {
              // There are character-level changes
              if (beforeMiddle) {
                lineChanges.before.add(i);
                unifiedBlocks.push({
                  lineNumber: i,
                  content: beforeLine,
                  type: 'removed',
                  correspondingLine: j,
                  charChanges: [
                    { value: prefix, type: 'unchanged' },
                    { value: beforeMiddle, type: 'removed' },
                    { value: suffix, type: 'unchanged' },
                  ],
                });
                i++;
              }

              if (afterMiddle) {
                lineChanges.after.add(j);
                unifiedBlocks.push({
                  lineNumber: j,
                  content: afterLine,
                  type: 'added',
                  correspondingLine: i - 1,
                  charChanges: [
                    { value: prefix, type: 'unchanged' },
                    { value: afterMiddle, type: 'added' },
                    { value: suffix, type: 'unchanged' },
                  ],
                });
                j++;
              }
            } else {
              // No character-level changes found, treat as regular line changes
              if (i < beforeLines.length) {
                lineChanges.before.add(i);
                unifiedBlocks.push({
                  lineNumber: i,
                  content: beforeLines[i],
                  type: 'removed',
                  correspondingLine: j,
                  charChanges: [{ value: beforeLines[i], type: 'removed' }],
                });
                i++;
              }

              if (j < afterLines.length) {
                lineChanges.after.add(j);
                unifiedBlocks.push({
                  lineNumber: j,
                  content: afterLines[j],
                  type: 'added',
                  correspondingLine: i - 1,
                  charChanges: [{ value: afterLines[j], type: 'added' }],
                });
                j++;
              }
            }
          } else {
            // Handle remaining lines
            if (i < beforeLines.length) {
              lineChanges.before.add(i);
              unifiedBlocks.push({
                lineNumber: i,
                content: beforeLines[i],
                type: 'removed',
                correspondingLine: j,
                charChanges: [{ value: beforeLines[i], type: 'removed' }],
              });
              i++;
            }

            if (j < afterLines.length) {
              lineChanges.after.add(j);
              unifiedBlocks.push({
                lineNumber: j,
                content: afterLines[j],
                type: 'added',
                correspondingLine: i - 1,
                charChanges: [{ value: afterLines[j], type: 'added' }],
              });
              j++;
            }
          }
        }
      }
    }

    // Sort blocks by line number
    const processedBlocks = unifiedBlocks.sort((a, b) => a.lineNumber - b.lineNumber);

    return {
      beforeLines,
      afterLines,
      hasChanges: lineChanges.before.size > 0 || lineChanges.after.size > 0,
      lineChanges,
      unifiedBlocks: processedBlocks,
      isBinary: false,
    };
  } catch (error) {
    console.error('Error processing changes:', error);
    return {
      beforeLines: [],
      afterLines: [],
      hasChanges: false,
      lineChanges: { before: new Set(), after: new Set() },
      unifiedBlocks: [],
      error: true,
      isBinary: false,
    };
  }
};

// =============== HOOKS ===============

/**
 * Custom hook for code difference processing with memoization
 */
const useProcessChanges = (beforeCode: string, afterCode: string): DiffProcessingResult => {
  return useMemo(() => processChanges(beforeCode, afterCode), [beforeCode, afterCode]);
};

/**
 * Custom hook to manage syntax highlighting
 */
const useHighlighter = () => {
  const [highlighter, setHighlighter] = useState<any>(null);

  useEffect(() => {
    getHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'typescript',
        'javascript',
        'json',
        'html',
        'css',
        'jsx',
        'tsx',
        'python',
        'php',
        'java',
        'c',
        'cpp',
        'csharp',
        'go',
        'ruby',
        'rust',
        'plaintext',
      ],
    }).then(setHighlighter);
  }, []);

  return highlighter;
};

/**
 * Custom hook to handle file history tracking and updates
 */
const useFileHistoryTracking = (
  selectedFile: string | null | undefined,
  currentDocument: EditorDocument | null,
  files: FileMap,
  fileHistory: Record<string, FileHistory>,
  setFileHistory: React.Dispatch<React.SetStateAction<Record<string, FileHistory>>>,
  unsavedFiles: Set<string>,
) => {
  useEffect(() => {
    if (!selectedFile || !currentDocument) {
      return;
    }

    const file = files[selectedFile];

    if (!file || !('content' in file)) {
      return;
    }

    const existingHistory = fileHistory[selectedFile];
    const currentContent = currentDocument.value;

    // Normalize content for comparison
    const normalizedCurrentContent = currentContent.replace(/\r\n/g, '\n').trim();
    const normalizedOriginalContent = (existingHistory?.originalContent || file.content).replace(/\r\n/g, '\n').trim();

    // If no history exists, create one if there are differences
    if (!existingHistory) {
      if (normalizedCurrentContent !== normalizedOriginalContent) {
        const newChanges = diffLines(file.content, currentContent);
        setFileHistory((prev) => ({
          ...prev,
          [selectedFile]: {
            originalContent: file.content,
            lastModified: Date.now(),
            changes: newChanges,
            versions: [
              {
                timestamp: Date.now(),
                content: currentContent,
              },
            ],
            changeSource: 'auto-save',
          },
        }));
      }

      return;
    }

    // If history exists, check if there are real changes since the last version
    const lastVersion = existingHistory.versions[existingHistory.versions.length - 1];
    const normalizedLastContent = lastVersion?.content.replace(/\r\n/g, '\n').trim();

    if (normalizedCurrentContent === normalizedLastContent) {
      return;
    }

    // Check for significant changes using diffFiles
    const relativePath = extractRelativePath(selectedFile);
    const unifiedDiff = diffFiles(relativePath, existingHistory.originalContent, currentContent);

    if (unifiedDiff) {
      const newChanges = diffLines(existingHistory.originalContent, currentContent);
      const hasSignificantChanges = newChanges.some(
        (change) => (change.added || change.removed) && change.value.trim().length > 0,
      );

      if (hasSignificantChanges) {
        const newHistory: FileHistory = {
          originalContent: existingHistory.originalContent,
          lastModified: Date.now(),
          changes: [...existingHistory.changes, ...newChanges].slice(-MAX_HISTORY_CHANGES),
          versions: [
            ...existingHistory.versions,
            {
              timestamp: Date.now(),
              content: currentContent,
            },
          ].slice(-MAX_VERSIONS),
          changeSource: 'auto-save',
        };

        setFileHistory((prev) => ({ ...prev, [selectedFile]: newHistory }));
      }
    }
  }, [selectedFile, currentDocument?.value, files, setFileHistory, unsavedFiles, fileHistory]);
};

// =============== COMPONENTS ===============

/**
 * Button to toggle fullscreen mode
 */
const FullscreenButton = memo(({ onClick, isFullscreen }: FullscreenButtonProps) => (
  <button
    onClick={onClick}
    className="ml-4 p-1 rounded hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
    aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
  >
    <div className={isFullscreen ? 'i-ph:corners-in' : 'i-ph:corners-out'} />
  </button>
));

/**
 * Fullscreen overlay for the diff view
 */
const FullscreenOverlay = memo(({ isFullscreen, children }: { isFullscreen: boolean; children: React.ReactNode }) => {
  if (!isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
      <div className="diff-fullscreen">{children}</div>
    </div>
  );
});

/**
 * Component to display warning messages
 */
const ContentWarning = memo(({ type }: { type: 'binary' | 'error' }) => (
  <div className="h-full flex items-center justify-center p-4">
    <div className="text-center text-bolt-elements-textTertiary">
      <div className={`i-ph:${type === 'binary' ? 'file-x' : 'warning-circle'} text-4xl text-red-400 mb-2 mx-auto`} />
      <p className="font-medium text-bolt-elements-textPrimary">
        {type === 'binary' ? 'Binary file detected' : 'Error processing file'}
      </p>
      <p className="text-sm mt-1">
        {type === 'binary' ? 'Diff view is not available for binary files' : 'Could not generate diff preview'}
      </p>
    </div>
  </div>
));

/**
 * Component to display when files are identical
 */
const NoChangesView = memo(
  ({
    beforeCode,
    language,
    highlighter,
    theme,
  }: {
    beforeCode: string;
    language: string;
    highlighter: any;
    theme: string;
  }) => (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="text-center text-bolt-elements-textTertiary">
        <div className="i-ph:files text-4xl text-green-400 mb-2 mx-auto" />
        <p className="font-medium text-bolt-elements-textPrimary">Files are identical</p>
        <p className="text-sm mt-1">Both versions match exactly</p>
      </div>
      <div className="mt-4 w-full max-w-2xl bg-bolt-elements-background-depth-1 rounded-lg border border-bolt-elements-borderColor overflow-hidden">
        <div className="p-2 text-xs font-bold text-bolt-elements-textTertiary border-b border-bolt-elements-borderColor">
          Current Content
        </div>
        <div className="overflow-auto max-h-96">
          {beforeCode.split('\n').map((line, index) => (
            <div key={index} className="flex group min-w-fit">
              <div className={lineNumberStyles}>{index + 1}</div>
              <div className={lineContentStyles}>
                <span className="mr-2"> </span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: highlighter
                      ? highlighter
                          .codeToHtml(line, {
                            lang: language,
                            theme: theme === 'dark' ? 'github-dark' : 'github-light',
                          })
                          .replace(/<\/?pre[^>]*>/g, '')
                          .replace(/<\/?code[^>]*>/g, '')
                      : line,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
);

/**
 * Button for navigating between changes
 */
const NavigationButton = memo(
  ({ direction, onClick, disabled }: { direction: 'next' | 'prev'; onClick: () => void; disabled: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1 rounded text-bolt-elements-textTertiary ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bolt-elements-background-depth-3 hover:text-bolt-elements-textPrimary'} transition-colors`}
      title={direction === 'next' ? 'Next change' : 'Previous change'}
      aria-label={direction === 'next' ? 'Next change' : 'Previous change'}
    >
      <div className={direction === 'next' ? 'i-ph:caret-down' : 'i-ph:caret-up'} />
    </button>
  ),
);

/**
 * Component for navigation controls
 */
const DiffNavigation = memo(
  ({ navigation, onNavigate }: { navigation: NavigationState; onNavigate: (direction: 'next' | 'prev') => void }) => {
    const { currentIndex, changeIndices } = navigation;
    const hasChanges = changeIndices.length > 0;
    const currentPosition = hasChanges ? currentIndex + 1 : 0;
    const totalChanges = changeIndices.length;

    return (
      <div className="flex items-center gap-1 ml-4 border-l border-bolt-elements-borderColor pl-4">
        <NavigationButton
          direction="prev"
          onClick={() => onNavigate('prev')}
          disabled={!hasChanges || currentIndex <= 0}
        />

        <span className="text-xs text-bolt-elements-textSecondary">
          {hasChanges ? `${currentPosition}/${totalChanges}` : 'No changes'}
        </span>

        <NavigationButton
          direction="next"
          onClick={() => onNavigate('next')}
          disabled={!hasChanges || currentIndex >= changeIndices.length - 1}
        />
      </div>
    );
  },
);

/**
 * Component for displaying scroll markers to indicate changed lines
 */
const ScrollMarkers = memo(({ unifiedBlocks, totalHeight }: { unifiedBlocks: DiffBlock[]; totalHeight: number }) => {
  // Apenas renderizar se houver altura suficiente
  if (totalHeight <= 0) {
    return null;
  }

  return (
    <div className="absolute right-0 top-0 bottom-0 w-2 z-10 pointer-events-none">
      {unifiedBlocks
        .filter((block) => block.type !== 'unchanged')
        .map((block, index) => {
          const percentage = (block.lineNumber / unifiedBlocks.length) * 100;
          const type = block.type === 'added' ? 'diff-scrollbar-marker-added' : 'diff-scrollbar-marker-removed';

          return (
            <div
              key={`marker-${index}`}
              className={`diff-scrollbar-marker ${type}`}
              style={{
                top: `${percentage}%`,
                height: `${Math.max(2, totalHeight / unifiedBlocks.length)}px`,
              }}
            />
          );
        })}
    </div>
  );
});

/**
 * Component for toggling high contrast mode
 */
const HighContrastToggle = memo(({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className="ml-2 p-1 rounded hover:bg-bolt-elements-background-depth-3 text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors diff-high-contrast-toggle"
    title={enabled ? 'Disable high contrast mode' : 'Enable high contrast mode'}
    aria-label={enabled ? 'Disable high contrast mode' : 'Enable high contrast mode'}
  >
    <div className={enabled ? 'i-ph-eye' : 'i-ph-eye-slash'} />
  </button>
));

/**
 * Component for displaying file information and statistics
 */
const FileInfo = memo(
  ({
    filename,
    hasChanges,
    onToggleFullscreen,
    isFullscreen,
    beforeCode,
    afterCode,
    highContrastEnabled,
    onToggleHighContrast,
  }: {
    filename: string;
    hasChanges: boolean;
    onToggleFullscreen: () => void;
    isFullscreen: boolean;
    beforeCode: string;
    afterCode: string;
    highContrastEnabled: boolean;
    onToggleHighContrast: () => void;
  }) => {
    // Calculate additions and deletions statistics
    const { additions, deletions } = useMemo(() => {
      if (!hasChanges) {
        return { additions: 0, deletions: 0 };
      }

      return calculateDiffStats(beforeCode, afterCode);
    }, [hasChanges, beforeCode, afterCode]);

    const showStats = additions > 0 || deletions > 0;

    // Determinar o tipo de arquivo para melhor exibição do ícone
    const getFileIcon = () => {
      const extension = filename.split('.').pop()?.toLowerCase();

      switch (extension) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
          return 'i-ph:file-js';
        case 'html':
        case 'xml':
          return 'i-ph:file-html';
        case 'css':
        case 'scss':
        case 'sass':
          return 'i-ph:file-css';
        case 'json':
          return 'i-ph:file-json';
        case 'md':
          return 'i-ph:file-text';
        case 'py':
          return 'i-ph:file-py';
        default:
          return 'i-ph:file';
      }
    };

    return (
      <div className="diff-file-info">
        <div className={`${getFileIcon()} mr-2 h-4 w-4 shrink-0`} />
        <span className="truncate">{filename}</span>
        <span className="ml-auto shrink-0 flex items-center gap-2">
          {hasChanges ? (
            <>
              {showStats && (
                <div className="flex items-center gap-1 text-xs">
                  {additions > 0 && <span className="text-green-700 dark:text-green-500">+{additions}</span>}
                  {deletions > 0 && <span className="text-red-700 dark:text-red-500">-{deletions}</span>}
                </div>
              )}
              <span className="text-yellow-600 dark:text-yellow-400">Modified</span>
              <span className="text-bolt-elements-textTertiary text-xs">{new Date().toLocaleTimeString()}</span>
            </>
          ) : (
            <span className="text-green-700 dark:text-green-400">No Changes</span>
          )}
          <HighContrastToggle enabled={highContrastEnabled} onToggle={onToggleHighContrast} />
          <FullscreenButton onClick={onToggleFullscreen} isFullscreen={isFullscreen} />
        </span>
      </div>
    );
  },
);

/**
 * Component for displaying a unified diff comparison
 */
const InlineDiffComparison = memo(({ beforeCode, afterCode, filename, language }: CodeComparisonProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const [highContrastEnabled, setHighContrastEnabled] = useState(false);
  const diffPanelRef = useRef<HTMLDivElement>(null);
  const highlighter = useHighlighter();
  const theme = useStore(themeStore);

  // Estado para navegação entre alterações
  const [navigation, setNavigation] = useState<NavigationState>({
    currentIndex: 0,
    changeIndices: [],
  });

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrastEnabled((prev) => !prev);
  }, []);

  const { unifiedBlocks, hasChanges, isBinary, error } = useProcessChanges(beforeCode, afterCode);

  // Calcular os índices das linhas alteradas para navegação
  useEffect(() => {
    if (hasChanges && unifiedBlocks.length > 0) {
      const indices = unifiedBlocks
        .map((block, index) => ({ index, type: block.type }))
        .filter((item) => item.type !== 'unchanged')
        .map((item) => item.index);

      setNavigation({
        currentIndex: indices.length > 0 ? 0 : -1,
        changeIndices: indices,
      });
    } else {
      setNavigation({
        currentIndex: -1,
        changeIndices: [],
      });
    }
  }, [hasChanges, unifiedBlocks]);

  // Navegar para a alteração anterior ou próxima
  const handleNavigation = useCallback(
    (direction: 'next' | 'prev') => {
      if (navigation.changeIndices.length === 0) {
        return;
      }

      setNavigation((prev) => {
        const newIndex =
          direction === 'next'
            ? Math.min(prev.currentIndex + 1, prev.changeIndices.length - 1)
            : Math.max(prev.currentIndex - 1, 0);

        // Rolar para a alteração
        const changeIndex = prev.changeIndices[newIndex];
        const element = document.getElementById(`diff-line-${changeIndex}`);

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return {
          ...prev,
          currentIndex: newIndex,
        };
      });
    },
    [navigation.changeIndices],
  );

  // Monitorar a altura do painel para posicionar os marcadores de rolagem
  useEffect(() => {
    if (diffPanelRef.current) {
      setPanelHeight(diffPanelRef.current.clientHeight);

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setPanelHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(diffPanelRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }

    return undefined;
  }, []);

  // Adicionar atalhos de teclado para navegação
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+N para próxima alteração, Alt+P para alteração anterior
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        handleNavigation('next');
      } else if (e.altKey && e.key === 'p') {
        e.preventDefault();
        handleNavigation('prev');
      }
      // Alt+H para alternar o modo de alto contraste
      else if (e.altKey && e.key === 'h') {
        e.preventDefault();
        toggleHighContrast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigation, toggleHighContrast]);

  if (isBinary || error) {
    return <ContentWarning type={isBinary ? 'binary' : 'error'} />;
  }

  return (
    <FullscreenOverlay isFullscreen={isFullscreen}>
      <div className={`w-full h-full flex flex-col ${highContrastEnabled ? 'diff-high-contrast' : ''}`}>
        <div className="flex flex-col">
          <FileInfo
            filename={filename}
            hasChanges={hasChanges}
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            beforeCode={beforeCode}
            afterCode={afterCode}
            highContrastEnabled={highContrastEnabled}
            onToggleHighContrast={toggleHighContrast}
          />
          {hasChanges && (
            <div className="flex items-center justify-between bg-bolt-elements-background-depth-1 p-2 border-t border-bolt-elements-borderColor text-sm">
              <span className="text-bolt-elements-textTertiary text-xs">
                <span className="i-ph:keyboard hidden sm:inline-block mr-1" />
                Navigation: <kbd className="diff-keyboard-shortcut">Alt+N</kbd> Next,
                <kbd className="diff-keyboard-shortcut">Alt+P</kbd> Previous,
                <kbd className="diff-keyboard-shortcut">Alt+H</kbd> High contrast
              </span>
              <DiffNavigation navigation={navigation} onNavigate={handleNavigation} />
            </div>
          )}
        </div>
        <div className={diffPanelStyles} ref={diffPanelRef}>
          {hasChanges ? (
            <div className="overflow-x-auto min-w-full relative">
              {unifiedBlocks.map((block, index) => (
                <CodeLine
                  key={`${block.lineNumber}-${index}`}
                  lineNumber={block.lineNumber}
                  content={block.content}
                  type={block.type}
                  highlighter={highlighter}
                  language={language}
                  block={block}
                  theme={theme}
                  isHighlighted={index === navigation.changeIndices[navigation.currentIndex]}
                  id={`diff-line-${index}`}
                />
              ))}
              <ScrollMarkers unifiedBlocks={unifiedBlocks} totalHeight={panelHeight} />
            </div>
          ) : (
            <NoChangesView beforeCode={beforeCode} language={language} highlighter={highlighter} theme={theme} />
          )}
        </div>
      </div>
    </FullscreenOverlay>
  );
});

/**
 * Component for rendering a single line of code with highlighting
 */
const CodeLine = memo(
  ({
    lineNumber,
    content,
    type,
    highlighter,
    language,
    block,
    theme,
    isHighlighted,
    id,
  }: {
    lineNumber: number;
    content: string;
    type: 'added' | 'removed' | 'unchanged';
    highlighter: any;
    language: string;
    block: DiffBlock;
    theme: string;
    isHighlighted?: boolean;
    id?: string;
  }) => {
    const bgColor = diffLineStyles[type];
    const highlightedClass = isHighlighted ? 'highlighted' : '';

    // Render content with appropriate highlighting
    const renderContent = () => {
      if (type === 'unchanged' || !block.charChanges) {
        const highlightedCode = highlighter
          ? highlighter
              .codeToHtml(content, { lang: language, theme: theme === 'dark' ? 'github-dark' : 'github-light' })
              .replace(/<\/?pre[^>]*>/g, '')
              .replace(/<\/?code[^>]*>/g, '')
          : content;
        return <span dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
      }

      return (
        <>
          {block.charChanges.map((change, index) => {
            const changeClass = changeColorStyles[change.type];

            const highlightedCode = highlighter
              ? highlighter
                  .codeToHtml(change.value, {
                    lang: language,
                    theme: theme === 'dark' ? 'github-dark' : 'github-light',
                  })
                  .replace(/<\/?pre[^>]*>/g, '')
                  .replace(/<\/?code[^>]*>/g, '')
              : change.value;

            return <span key={index} className={changeClass} dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
          })}
        </>
      );
    };

    return (
      <div className={`diff-line ${highlightedClass}`} id={id}>
        <div className={lineNumberStyles}>{lineNumber + 1}</div>
        <div className={`${lineContentStyles} ${bgColor}`}>
          <span className="mr-2 text-bolt-elements-textTertiary">
            {type === 'added' && <span className="text-green-700 dark:text-green-500">+</span>}
            {type === 'removed' && <span className="text-red-700 dark:text-red-500">-</span>}
            {type === 'unchanged' && ' '}
          </span>
          {renderContent()}
        </div>
      </div>
    );
  },
);

/**
 * Main DiffView component that ties everything together
 */
export const DiffView = memo(({ fileHistory, setFileHistory }: DiffViewProps) => {
  const files = useStore(workbenchStore.files) as FileMap;
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument) as EditorDocument;
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);

  // Track file history changes
  useFileHistoryTracking(selectedFile, currentDocument, files, fileHistory, setFileHistory, unsavedFiles);

  if (!selectedFile || !currentDocument) {
    return (
      <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
        Select a file to view differences
      </div>
    );
  }

  const file = files[selectedFile];
  const originalContent = file && 'content' in file ? file.content : '';
  const currentContent = currentDocument.value;

  const history = fileHistory[selectedFile];
  const effectiveOriginalContent = history?.originalContent || originalContent;
  const language = getLanguageFromExtension(selectedFile.split('.').pop() || '');

  try {
    return (
      <div className="h-full overflow-hidden">
        <InlineDiffComparison
          beforeCode={effectiveOriginalContent}
          afterCode={currentContent}
          language={language}
          filename={selectedFile}
          lightTheme="github-light"
          darkTheme="github-dark"
        />
      </div>
    );
  } catch (error) {
    console.error('DiffView render error:', error);
    return (
      <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1 text-red-400">
        <div className="text-center">
          <div className="i-ph:warning-circle text-4xl mb-2" />
          <p>Failed to render diff view</p>
        </div>
      </div>
    );
  }
});
