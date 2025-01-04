import type { WebContainer } from '@webcontainer/api';
import { useCallback, useEffect, useState, useRef, type MutableRefObject } from 'react';
import { webcontainer as webcontainerPromise } from '~/lib/webcontainer';
import git, { type GitAuth, type PromiseFsClient } from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import Cookies from 'js-cookie';

const lookupSavedPassword = (url: string) => {
  const domain = url.split('/')[2];
  const gitCreds = Cookies.get(`git:${domain}`);

  if (!gitCreds) {
    return null;
  }

  try {
    const { username, password } = JSON.parse(gitCreds || '{}');
    return { username, password };
  } catch (error) {
    console.log(`Failed to parse Git Cookie ${error}`);
    return null;
  }
};

const saveGitAuth = (url: string, auth: GitAuth) => {
  const domain = url.split('/')[2];
  Cookies.set(`git:${domain}`, JSON.stringify(auth));
};

interface GitCloneResult {
  workdir: string;
  data: Record<string, { data: any; encoding?: string; size?: number }>;
}

interface GitCloneCache {
  [url: string]: {
    timestamp: number;
    result: GitCloneResult;
  };
}

const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

export function useGit() {
  const [ready, setReady] = useState(false);
  const [webcontainer, setWebcontainer] = useState<WebContainer>();
  const [fs, setFs] = useState<PromiseFsClient>();
  const fileData = useRef<Record<string, { data: any; encoding?: string; size?: number }>>({});
  const cloneCache = useRef<GitCloneCache>({});
  const [cloneProgress, setCloneProgress] = useState<{
    phase: 'init' | 'clone' | 'process' | 'complete';
    progress: number;
    detail: string;
  } | null>(null);

  useEffect(() => {
    webcontainerPromise.then((container) => {
      fileData.current = {};
      setWebcontainer(container);
      setFs(getFs(container, fileData));
      setReady(true);
    });
  }, []);

  const clearOldCache = useCallback(() => {
    const now = Date.now();
    let totalSize = 0;

    const entries = Object.entries(cloneCache.current).sort(([, a], [, b]) => b.timestamp - a.timestamp);

    cloneCache.current = entries.reduce((acc, [url, cache]) => {
      if (now - cache.timestamp > CACHE_DURATION) {
        return acc;
      }

      const size = Object.values(cache.result.data).reduce((sum, file) => sum + (file.size || 0), 0);

      if (totalSize + size <= MAX_CACHE_SIZE) {
        totalSize += size;
        acc[url] = cache;
      }

      return acc;
    }, {} as GitCloneCache);
  }, []);

  const gitClone = useCallback(
    async (url: string): Promise<GitCloneResult> => {
      if (!webcontainer || !fs || !ready) {
        throw new Error('Webcontainer não inicializado');
      }

      setCloneProgress({ phase: 'init', progress: 0, detail: 'Iniciando clone...' });
      clearOldCache();

      const cached = cloneCache.current[url];

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setCloneProgress({ phase: 'complete', progress: 100, detail: 'Usando versão em cache' });
        return cached.result;
      }

      fileData.current = {};

      try {
        setCloneProgress({ phase: 'clone', progress: 20, detail: 'Clonando repositório...' });

        await git.clone({
          fs,
          http,
          dir: webcontainer.workdir,
          url,
          depth: 2,
          singleBranch: false,
          corsProxy: 'https://cors.isomorphic-git.org',
          onProgress: (event) => {
            if (event.phase === 'Counting objects') {
              setCloneProgress({
                phase: 'clone',
                progress: 20 + (event.loaded / (event.total || 1)) * 30,
                detail: `Contando objetos: ${event.loaded}/${event.total}`,
              });
            } else if (event.phase === 'Receiving objects') {
              setCloneProgress({
                phase: 'clone',
                progress: 50 + (event.loaded / (event.total || 1)) * 30,
                detail: `Recebendo objetos: ${event.loaded}/${event.total}`,
              });
            }
          },
          onAuth: async (url) => {
            let auth = lookupSavedPassword(url);

            if (auth) {
              return auth;
            }

            if (confirm('This repo is password protected. Ready to enter a username & password?')) {
              auth = {
                username: prompt('Enter username'),
                password: prompt('Enter password'),
              };
              return auth;
            } else {
              return { cancel: true };
            }
          },
          onAuthSuccess: (url, auth) => {
            saveGitAuth(url, auth);
          },
        });

        setCloneProgress({ phase: 'process', progress: 80, detail: 'Processando arquivos...' });

        try {
          const gitModules = await fs.promises.readFile(`${webcontainer.workdir}/.gitmodules`, 'utf8');

          if (gitModules) {
            const submodules = gitModules.match(/path = (.+)/g)?.map((line: string) => line.split(' = ')[1]);

            if (submodules) {
              for (const submodule of submodules) {
                try {
                  await git.clone({
                    fs,
                    http,
                    dir: `${webcontainer.workdir}/${submodule}`,
                    url: url.replace(/\.git$/, '') + '/' + submodule + '.git',
                    depth: 1,
                  });
                } catch {
                  console.warn(`Falha ao clonar submodule ${submodule}:`);
                }
              }
            }
          }
        } catch {
          // Ignora se não houver .gitmodules
        }

        const result = {
          workdir: webcontainer.workdir,
          data: Object.entries(fileData.current).reduce((acc, [path, data]) => {
            const stats = fs.promises.stat(path);
            return {
              ...acc,
              [path]: {
                ...data,
                size: stats ? (stats as any).size : data.data?.length || 0,
              },
            };
          }, {}),
        };

        cloneCache.current[url] = {
          timestamp: Date.now(),
          result,
        };

        setCloneProgress({ phase: 'complete', progress: 100, detail: 'Clone concluído' });

        return result;
      } catch {
        console.error('Erro durante o clone:');
        throw new Error('Erro ao clonar repositório. Por favor, tente novamente.');
      }
    },
    [webcontainer, fs, ready, clearOldCache],
  );

  return {
    ready,
    gitClone,
    cloneProgress,
  };
}

const getFs = (
  webcontainer: WebContainer,
  record: MutableRefObject<Record<string, { data: any; encoding?: string; size?: number }>>,
) => ({
  promises: {
    readFile: async (path: string, options: any) => {
      const encoding = options.encoding;
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      console.log('readFile', relativePath, encoding);

      return await webcontainer.fs.readFile(relativePath, encoding);
    },
    writeFile: async (path: string, data: any, options: any) => {
      const encoding = options.encoding;
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      console.log('writeFile', { relativePath, data, encoding });

      if (record.current) {
        record.current[relativePath] = { data, encoding };
      }

      return await webcontainer.fs.writeFile(relativePath, data, { ...options, encoding });
    },
    mkdir: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      console.log('mkdir', relativePath, options);

      return await webcontainer.fs.mkdir(relativePath, { ...options, recursive: true });
    },
    readdir: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      console.log('readdir', relativePath, options);

      return await webcontainer.fs.readdir(relativePath, options);
    },
    rm: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      console.log('rm', relativePath, options);

      return await webcontainer.fs.rm(relativePath, { ...(options || {}) });
    },
    rmdir: async (path: string, options: any) => {
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      console.log('rmdir', relativePath, options);

      return await webcontainer.fs.rm(relativePath, { recursive: true, ...options });
    },

    // Mock implementations for missing functions
    unlink: async (path: string) => {
      // unlink is just removing a single file
      const relativePath = pathUtils.relative(webcontainer.workdir, path);
      return await webcontainer.fs.rm(relativePath, { recursive: false });
    },

    stat: async (path: string) => {
      try {
        const relativePath = pathUtils.relative(webcontainer.workdir, path);
        const resp = await webcontainer.fs.readdir(pathUtils.dirname(relativePath), { withFileTypes: true });
        const name = pathUtils.basename(relativePath);
        const fileInfo = resp.find((x) => x.name == name);

        if (!fileInfo) {
          throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
        }

        return {
          isFile: () => fileInfo.isFile(),
          isDirectory: () => fileInfo.isDirectory(),
          isSymbolicLink: () => false,
          size: 1,
          mode: 0o666, // Default permissions
          mtimeMs: Date.now(),
          uid: 1000,
          gid: 1000,
        };
      } catch {
        const err = new Error(`ENOENT: no such file or directory, stat '${path}'`) as NodeJS.ErrnoException;
        err.code = 'ENOENT';
        err.errno = -2;
        err.syscall = 'stat';
        err.path = path;
        throw err;
      }
    },

    lstat: async (path: string) => {
      /*
       * For basic usage, lstat can return the same as stat
       * since we're not handling symbolic links
       */
      return await getFs(webcontainer, record).promises.stat(path);
    },

    readlink: async (path: string) => {
      /*
       * Since WebContainer doesn't support symlinks,
       * we'll throw a "not a symbolic link" error
       */
      throw new Error(`EINVAL: invalid argument, readlink '${path}'`);
    },

    symlink: async (target: string, path: string) => {
      /*
       * Since WebContainer doesn't support symlinks,
       * we'll throw a "operation not supported" error
       */
      throw new Error(`EPERM: operation not permitted, symlink '${target}' -> '${path}'`);
    },

    chmod: async (_path: string, _mode: number) => {
      /*
       * WebContainer doesn't support changing permissions,
       * but we can pretend it succeeded for compatibility
       */
      return await Promise.resolve();
    },
  },
});

const pathUtils = {
  dirname: (path: string) => {
    // Handle empty or just filename cases
    if (!path || !path.includes('/')) {
      return '.';
    }

    // Remove trailing slashes
    path = path.replace(/\/+$/, '');

    // Get directory part
    return path.split('/').slice(0, -1).join('/') || '/';
  },

  basename: (path: string, ext?: string) => {
    // Remove trailing slashes
    path = path.replace(/\/+$/, '');

    // Get the last part of the path
    const base = path.split('/').pop() || '';

    // If extension is provided, remove it from the result
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }

    return base;
  },
  relative: (from: string, to: string): string => {
    // Handle empty inputs
    if (!from || !to) {
      return '.';
    }

    // Normalize paths by removing trailing slashes and splitting
    const normalizePathParts = (p: string) => p.replace(/\/+$/, '').split('/').filter(Boolean);

    const fromParts = normalizePathParts(from);
    const toParts = normalizePathParts(to);

    // Find common parts at the start of both paths
    let commonLength = 0;
    const minLength = Math.min(fromParts.length, toParts.length);

    for (let i = 0; i < minLength; i++) {
      if (fromParts[i] !== toParts[i]) {
        break;
      }

      commonLength++;
    }

    // Calculate the number of "../" needed
    const upCount = fromParts.length - commonLength;

    // Get the remaining path parts we need to append
    const remainingPath = toParts.slice(commonLength);

    // Construct the relative path
    const relativeParts = [...Array(upCount).fill('..'), ...remainingPath];

    // Handle empty result case
    return relativeParts.length === 0 ? '.' : relativeParts.join('/');
  },
};
