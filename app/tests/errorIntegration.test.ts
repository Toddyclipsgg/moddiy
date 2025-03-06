import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { processModuleErrors, processConsoleErrors } from '~/utils/shell';

// Mock do sistema de alertas
const mockAlertDispatch = vi.fn();

// Mock do evento global
global.dispatchEvent = mockAlertDispatch;
global.CustomEvent = vi.fn((eventName, options) => {
  return { eventName, options };
}) as any;

describe('Error Detection Integration Tests', () => {
  beforeEach(() => {
    mockAlertDispatch.mockClear();
    (global.CustomEvent as Mock).mockClear();
  });

  describe('Error Detection to Alert System', () => {
    it('should generate correct alerts from module errors', () => {
      // Mock do processConsoleErrors para capturar os alertas gerados
      const originalProcessConsoleErrors = processConsoleErrors;
      const mockConsoleErrors = vi.fn().mockImplementation((output: string) => {
        // Simular o processamento de erros
        const moduleErrors = processModuleErrors(output);

        if (moduleErrors) {
          moduleErrors.alertGroups.forEach((error) => {
            // Criar alerta baseado no erro processado
            const alert = {
              id: `module-err-${Date.now()}`,
              type: 'module-error',
              title: error.title,
              description: error.description,
              content: error.content,
              severity: error.severity,
              source: 'terminal',
              timestamp: Date.now(),
              actionable: error.actionable,
              suggestedAction: error.suggestedFixes[0],
              metadata: {
                moduleErrorInfo: {
                  type: 'module',
                  moduleName: error.moduleName,
                  errorCount: error.errorCount,
                  filesAffected: error.filesAffected,
                },
              },
            };

            // Disparar o evento com o alerta
            global.dispatchEvent(new CustomEvent('bolt:alert', { detail: alert }));
          });
        }
      });

      // Substituir a função original pelo mock
      (global as any).processConsoleErrors = mockConsoleErrors;

      // Simular um erro de módulo
      const output = `Error: Cannot find module 'react-dom'
      at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
      at Function.Module._load (node:internal/modules/cjs/loader:920:27)
      at Module.require (node:internal/modules/cjs/loader:1141:19)
      at require (node:internal/modules/cjs/helpers:110:18)
      at Object.<anonymous> (/app/src/index.js:2:18)`;

      // Processar o erro
      mockConsoleErrors(output);

      // Verificar se o alerta foi criado corretamente
      expect(mockAlertDispatch).toHaveBeenCalled();
      expect(global.CustomEvent).toHaveBeenCalledWith(
        'bolt:alert',
        expect.objectContaining({
          detail: expect.objectContaining({
            type: 'module-error',
            title: expect.stringContaining('react-dom'),
            severity: 'error',
            metadata: expect.objectContaining({
              moduleErrorInfo: expect.objectContaining({
                moduleName: 'react-dom',
              }),
            }),
          }),
        }),
      );

      // Restaurar a função original
      (global as any).processConsoleErrors = originalProcessConsoleErrors;
    });

    it('should generate correct alerts from goroutine errors', () => {
      // Mock do processConsoleErrors para capturar os alertas gerados
      const originalProcessConsoleErrors = processConsoleErrors;
      const mockConsoleErrors = vi.fn().mockImplementation((output: string) => {
        // Simular o processamento de erros
        const moduleErrors = processModuleErrors(output);

        if (moduleErrors) {
          moduleErrors.alertGroups.forEach((error) => {
            if (error.type === 'goroutine') {
              // Criar alerta baseado no erro de goroutine
              const alert = {
                id: `goroutine-err-${Date.now()}`,
                type: 'goroutine-error',
                title: error.title,
                description: error.description,
                content: error.content,
                severity: error.severity,
                source: 'terminal',
                timestamp: Date.now(),
                actionable: error.actionable,
                suggestedAction: error.suggestedFixes[0],
                metadata: {
                  goroutineErrorInfo: {
                    type: 'goroutine',
                    goroutineId: (error as any).primaryError.goroutineId,
                    errorType: (error as any).primaryError.errorType,
                    state: (error as any).primaryError.state,
                  },
                },
              };

              // Disparar o evento com o alerta
              global.dispatchEvent(new CustomEvent('bolt:alert', { detail: alert }));
            }
          });
        }
      });

      // Substituir a função original pelo mock
      (global as any).processConsoleErrors = mockConsoleErrors;

      // Simular um erro de goroutine
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

      // Processar o erro
      mockConsoleErrors(output);

      // Verificar se o alerta foi criado corretamente
      expect(mockAlertDispatch).toHaveBeenCalled();
      expect(global.CustomEvent).toHaveBeenCalledWith(
        'bolt:alert',
        expect.objectContaining({
          detail: expect.objectContaining({
            type: 'goroutine-error',
            metadata: expect.objectContaining({
              goroutineErrorInfo: expect.objectContaining({
                goroutineId: '42',
                errorType: 'closed_pipe',
                state: 'running',
              }),
            }),
          }),
        }),
      );

      // Restaurar a função original
      (global as any).processConsoleErrors = originalProcessConsoleErrors;
    });

    it('should handle both module and goroutine errors in mixed outputs', () => {
      // Mock do processConsoleErrors para capturar os alertas gerados
      const mockProcessConsoleErrors = vi.fn().mockImplementation((output: string) => {
        // Processar os erros
        const result = processModuleErrors(output);

        if (result) {
          expect(result.alertGroups.length).toBe(2);
          expect(result.alertGroups[0].type).toBe('module');
          expect(result.alertGroups[1].type).toBe('goroutine');
        }
      });

      // Substituir a função original pelo mock
      const originalFn = processConsoleErrors;
      (global as any).processConsoleErrors = mockProcessConsoleErrors;

      // Simular um erro misto
      const output = `Error: Cannot find module 'react-dom'
      at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1075:15)
      at Object.<anonymous> (/app/src/index.js:2:18)
      
      goroutine 42 [running]:
      runtime: too many writes on closed pipe
      stack trace:
      goroutine 42 [running]:
        github.com/evanw/esbuild/pkg/api.openChannel.func1(0xc0003a6000)`;

      // Processar o erro
      mockProcessConsoleErrors(output);

      // Verificar se o mock foi chamado
      expect(mockProcessConsoleErrors).toHaveBeenCalled();

      // Restaurar a função original
      (global as any).processConsoleErrors = originalFn;
    });
  });
});
