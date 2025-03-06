// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectModuleNotFoundErrors,
  detectGoroutineErrors,
  processModuleErrors,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  processConsoleErrors,
} from '~/utils/shell';

describe('Error Detection System', () => {
  // Test for module not found errors
  describe('Module Error Detection', () => {
    it('should detect basic "Cannot find module" errors', () => {
      const output = `Error: Cannot find module 'react-query'
      at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
      at Function.Module._load (node:internal/modules/cjs/loader:920:27)
      at Module.require (node:internal/modules/cjs/loader:1141:19)
      at require (node:internal/modules/cjs/helpers:110:18)
      at Object.<anonymous> (/app/src/components/App.js:3:1)`;

      const errors = detectModuleNotFoundErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].moduleName).toBe('react-query');
      expect(errors[0].filePath).toBe('/app/src/components/App.js');
      expect(errors[0].lineNumber).toBe(3);
      expect(errors[0].columnNumber).toBe(1);
    });

    it('should detect npm ERR! 404 errors', () => {
      const output = `npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/react-quary - Not found
npm ERR! 404 
npm ERR! 404 react-quary@2.0.0 is not in the npm registry.
npm ERR! 404 You should bug the author to publish it (or use the name yourself!)
npm ERR! 404 
npm ERR! 404 Note that you can also install from a
npm ERR! 404 tarball, folder, http url, or git url.`;

      const errors = detectModuleNotFoundErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].moduleName).toBe('react-quary');
      expect(errors[0].errorContext).toBeDefined();
    });

    it('should detect npm ERESOLVE conflicts', () => {
      const output = `npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
npm ERR! 
npm ERR! Found: react@17.0.2
npm ERR! node_modules/react
npm ERR!   react@"^17.0.2" from the root project
npm ERR! 
npm ERR! Could not resolve dependency:
npm ERR! peer react@"^18.0.0" from @tanstack/react-query@4.0.0
npm ERR! node_modules/@tanstack/react-query
npm ERR!   @tanstack/react-query@"^4.0.0" from the root project
npm ERR! 
npm ERR! Fix the upstream dependency conflict, or retry
npm ERR! this command with --force, or --legacy-peer-deps`;

      const errors = detectModuleNotFoundErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].moduleName).toBe('react');
      expect(errors[0].relatedPackages).toBeDefined();
      expect(errors[0].packageJsonContext?.hasSimilarDeps).toBe(true);
    });

    it('should handle multiple module errors in the same output', () => {
      const output = `Error: Cannot find module 'react-dom'
      at /app/src/index.js:2:18
      
      Error: Cannot find module '@emotion/react'
      at /app/src/theme.js:1:22`;

      const errors = detectModuleNotFoundErrors(output);

      expect(errors).toHaveLength(2);
      expect(errors[0].moduleName).toBe('react-dom');
      expect(errors[1].moduleName).toBe('@emotion/react');
    });
  });

  // Test for goroutine errors
  describe('Goroutine Error Detection', () => {
    it('should detect "too many writes on closed pipe" errors', () => {
      const output = `goroutine 42 [running]:
runtime: too many writes on closed pipe
stack trace:
goroutine 42 [running]:
	github.com/evanw/esbuild/pkg/api.openChannel.func1(0xc0003a6000)
	/usr/local/go/src/runtime/panic.go:212 +0x55
	github.com/evanw/esbuild/pkg/api.(*apiImpl).Build(0xc0000ae180, {0xc0001de490, 0x1, 0x1})
	/usr/local/go/src/runtime/proc.go:203 +0x1fc
main.main()
	/tmp/esbuild/esbuild.go:15 +0x57
exit status 2`;

      const errors = detectGoroutineErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('closed_pipe');
      expect(errors[0].goroutineId).toBe('42');
      expect(errors[0].state).toBe('running');
      expect(errors[0].stackTrace).toBeDefined();
      expect(errors[0].stackTrace.length).toBeGreaterThan(0);
    });

    it('should detect panic errors', () => {
      const output = `goroutine 36 [running]:
panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x55d5f0]

stack trace:
goroutine 36 [running]:
	github.com/evanw/esbuild/pkg/api.(*dummyRenderer).RenderToken(0x0, {0xc0000, 0x9})
	/go/pkg/mod/github.com/evanw/esbuild@v0.14.39/pkg/api/api_impl.go:157 +0x55
	github.com/evanw/esbuild/pkg/api.(*Host).RenderToString(0xc00000e360, {0xc0001d6690, 0x1f})
	/go/pkg/mod/github.com/evanw/esbuild@v0.14.39/pkg/api/api_impl.go:664 +0xa5
main.main()
	./main.go:70`;

      const errors = detectGoroutineErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('panic');
      expect(errors[0].goroutineId).toBe('36');
      expect(errors[0].state).toBe('running');
      expect(errors[0].message).toContain('invalid memory address');
    });

    it('should detect multiple goroutine errors', () => {
      const output = `goroutine 42 [running]:
runtime: too many writes on closed pipe

goroutine 36 [running]:
panic: fatal error: runtime: out of memory`;

      const errors = detectGoroutineErrors(output);

      expect(errors).toHaveLength(2);
      expect(errors[0].goroutineId).toBe('42');
      expect(errors[1].goroutineId).toBe('36');
    });
  });

  // Test for the combined processing function
  describe('Module Errors Processing', () => {
    it('should process and group module errors correctly', () => {
      const output = `Error: Cannot find module 'lodash'
      at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
      at /app/src/utils.js:5:10
      
      Error: Cannot find module 'lodash'
      at /app/src/components/App.js:8:12`;

      const result = processModuleErrors(output);

      expect(result).not.toBeNull();
      expect(result?.alertGroups).toHaveLength(1);
      expect(result?.totalErrorCount).toBe(2);
      expect(result?.alertGroups[0].type).toBe('module');
      expect(result?.alertGroups[0].moduleName).toBe('lodash');
      expect(result?.alertGroups[0].errorCount).toBe(2);
      expect(result?.alertGroups[0].suggestedFixes).toBeDefined();
      expect(result?.alertGroups[0].suggestedFixes.length).toBeGreaterThan(0);
    });

    it('should process and group goroutine errors correctly', () => {
      const output = `goroutine 42 [running]:
runtime: too many writes on closed pipe
stack trace:
goroutine 42 [running]:
	github.com/evanw/esbuild/pkg/api.openChannel.func1(0xc0003a6000)
	
goroutine 43 [running]:
runtime: too many writes on closed pipe
stack trace:
goroutine 43 [running]:
	github.com/evanw/esbuild/pkg/api.openChannel.func1(0xc0003a6001)`;

      const result = processModuleErrors(output);

      expect(result).not.toBeNull();
      expect(result?.alertGroups).toHaveLength(1);
      expect(result?.totalErrorCount).toBe(2);
      expect(result?.alertGroups[0].type).toBe('goroutine');
      expect(result?.alertGroups[0].suggestedFixes).toBeDefined();
      expect(result?.alertGroups[0].suggestedFixes.length).toBeGreaterThan(0);
    });

    it('should return null for outputs with no errors', () => {
      const output = `Starting development server...
Compiled successfully!
Server running at http://localhost:3000`;

      const result = processModuleErrors(output);

      expect(result).toBeNull();
    });

    it('should handle mixed module and goroutine errors', () => {
      const output = `Error: Cannot find module 'react-dom'
      at /app/src/index.js:2:18
      
      goroutine 42 [running]:
      runtime: too many writes on closed pipe`;

      const result = processModuleErrors(output);

      expect(result).not.toBeNull();
      expect(result?.alertGroups).toHaveLength(2);
      expect(result?.totalErrorCount).toBe(2);
      expect(result?.alertGroups[0].type).toBe('module');
      expect(result?.alertGroups[1].type).toBe('goroutine');
    });
  });

  // Teste para erros específicos de NPM
  describe('NPM Error Detection', () => {
    it('should detect npm version incompatibility errors', () => {
      const output = `npm ERR! code ETARGET
npm ERR! notarget No matching version found for react-dom@19.0.0.
npm ERR! notarget In most cases you or one of your dependencies are requesting
npm ERR! notarget a package version that doesn't exist.
npm ERR! 
npm ERR! The latest version of 'react-dom' is 18.2.0`;

      const errors = detectModuleNotFoundErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].moduleName).toBe('react-dom');
      expect(errors[0].errorContext?.fullErrorMessage).toContain('No matching version found');
    });

    it('should detect npm permission errors', () => {
      const output = `npm ERR! code EACCES
npm ERR! syscall access
npm ERR! path /usr/local/lib/node_modules
npm ERR! errno -13
npm ERR! 
npm ERR! Your cache folder contains root-owned files, due to a bug in
npm ERR! previous versions of npm which has since been addressed.
npm ERR! 
npm ERR! To fix this problem, please run:
npm ERR!   sudo chown -R 1001:1001 "/home/node/.npm"`;

      const errors = detectModuleNotFoundErrors(output);

      expect(errors).toHaveLength(1);
      expect(errors[0].errorContext?.fullErrorMessage).toContain('EACCES');
    });
  });
});
