import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';
import { processConsoleErrors, processModuleErrors } from '~/utils/shell';
import type { ProcessedModuleError, ProcessedGoroutineError, ProcessedError } from '~/utils/shell';
import { alertService } from '~/lib/services/alertService';
import type {
  PreviewMessage,
  ConsoleErrorMessage,
  UncaughtExceptionMessage,
  UnhandledRejectionMessage,
  BasePreviewMessage,
} from '@webcontainer/api';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        /*
         * Precisamos importar o módulo workbench aqui para evitar importações circulares
         * mas não precisamos usar diretamente a instância do store
         */
        await import('~/lib/stores/workbench');

        // Debouncing para reduzir chamadas de processamento
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const lastProcessedTime = 0;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const DEBOUNCE_INTERVAL = 500; // ms

        // Cache para filtrar erros duplicados
        const processedModuleErrors = new Map<string, number>();

        // Adicionar um temporizador para evitar processamento excessivo em erros consecutivos
        let errorProcessingTimeout: NodeJS.Timeout;

        const debouncedProcessErrors = (errorText: string) => {
          // Adicionar um temporizador para evitar processamento excessivo em erros consecutivos
          clearTimeout(errorProcessingTimeout);
          errorProcessingTimeout = setTimeout(() => {
            // Processar diferentes tipos de erros
            try {
              // Processar erros de módulo e goroutine
              const processedErrors = processModuleErrors(errorText);

              if (processedErrors && processedErrors.alertGroups.length > 0) {
                // Enviar os erros processados para o sistema de alertas
                processedErrors.alertGroups.forEach((errorGroup: ProcessedError) => {
                  const metadata: Record<string, any> = {};

                  if (errorGroup.type === 'module') {
                    const moduleError = errorGroup as ProcessedModuleError;
                    metadata.moduleErrorInfo = {
                      type: 'module',
                      moduleName: moduleError.moduleName,
                      filePath: moduleError.primaryError.filePath,
                    };

                    if (moduleError.primaryError.filePath) {
                      metadata.filePath = moduleError.primaryError.filePath;
                      metadata.line = moduleError.primaryError.lineNumber;
                      metadata.column = moduleError.primaryError.columnNumber;
                    }
                  } else if (errorGroup.type === 'goroutine') {
                    const goroutineError = errorGroup as ProcessedGoroutineError;
                    metadata.goroutineErrorInfo = {
                      type: 'goroutine',
                      goroutineId: goroutineError.primaryError.goroutineId,
                      errorType: goroutineError.primaryError.errorType,
                      state: goroutineError.primaryError.state,
                    };

                    if (goroutineError.primaryError.additionalInfo?.file) {
                      metadata.filePath = goroutineError.primaryError.additionalInfo.file;
                      metadata.line = goroutineError.primaryError.additionalInfo.line;
                    }
                  }

                  // Criar alerta com informações relevantes
                  const alert: any = {
                    id: `err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    type: errorGroup.type === 'module' ? 'module-error' : 'goroutine-error',
                    title: errorGroup.title,
                    description: errorGroup.description,
                    content: errorGroup.content,
                    severity: errorGroup.severity,
                    source: 'terminal',
                    timestamp: Date.now(),
                    actionable: errorGroup.actionable,
                    metadata,
                  };

                  // Adicionar sugestão de ação se disponível
                  if (errorGroup.suggestedFixes && errorGroup.suggestedFixes.length > 0) {
                    alert.suggestedAction = errorGroup.suggestedFixes[0];
                  }

                  // Enviar o alerta para o sistema
                  window.dispatchEvent(new CustomEvent('bolt:alert', { detail: alert }));
                });

                // Também processar os erros de console se necessário
                processConsoleErrors(errorText);

                return;
              }

              // Verificar padrões específicos para erros de npm
              const npmErrorInfo = checkForNpmError(errorText);

              if (npmErrorInfo) {
                const { title, description, severity, moduleName } = npmErrorInfo;

                // Criar alerta para erro de npm
                const alert: any = {
                  id: `npm-err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  type: 'npm-error',
                  title,
                  description,
                  content: errorText,
                  severity,
                  source: 'terminal',
                  timestamp: Date.now(),
                  actionable: true,
                  metadata: {
                    npmError: {
                      type: 'npm',
                      moduleName,
                    },
                  },
                  suggestedAction: `npm install ${moduleName}`,
                };

                window.dispatchEvent(new CustomEvent('bolt:alert', { detail: alert }));

                return;
              }

              // Verificar se é uma saída normal do npm install
              if (isNpmInstallOutput(errorText)) {
                // Não gerar alerta para saídas normais do npm install
                return;
              }

              // Verificar se é um erro genérico de esbuild
              if (isEsbuildError(errorText)) {
                const alert: any = {
                  id: `esbuild-err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  type: 'esbuild-error',
                  title: 'Erro de Build',
                  description: 'Ocorreu um erro durante o build do esbuild',
                  content: errorText,
                  severity: 'error',
                  source: 'terminal',
                  timestamp: Date.now(),
                  actionable: true,
                };

                window.dispatchEvent(new CustomEvent('bolt:alert', { detail: alert }));

                return;
              }

              /*
               * Se nenhum dos processadores específicos manipular o erro,
               * criar um alerta genérico
               */
              const alert: any = {
                id: `generic-err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'generic-error',
                title: 'Erro de Terminal',
                description: 'Ocorreu um erro durante a execução do comando',
                content: errorText,
                severity: 'warning',
                source: 'terminal',
                timestamp: Date.now(),
                actionable: false,
              };

              window.dispatchEvent(new CustomEvent('bolt:alert', { detail: alert }));
            } catch (error) {
              // Em caso de erro no processamento, criar um alerta de fallback
              const fallbackAlert: any = {
                id: `fallback-err-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                type: 'processing-error',
                title: 'Erro de Processamento',
                description: 'Ocorreu um erro ao processar as mensagens de erro',
                content: errorText,
                severity: 'info',
                source: 'system',
                timestamp: Date.now(),
                actionable: false,
              };

              window.dispatchEvent(new CustomEvent('bolt:alert', { detail: fallbackAlert }));

              console.error('Erro ao processar output do terminal:', error);
            }
          }, 300); // Atrasar o processamento para agrupar erros relacionados
        };

        // Função para verificar se é uma saída normal do npm install
        const isNpmInstallOutput = (output: string): boolean => {
          return (
            output.includes('preloadMetadata') ||
            output.includes('npm WARN') ||
            (output.includes('npm') && output.includes('packages from'))
          );
        };

        // Função para verificar erros de npm
        const checkForNpmError = (
          output: string,
        ): { title: string; description: string; severity: string; moduleName: string } | null => {
          // Verificar erros de versão não encontrada
          const versionMatch = output.match(/No matching version found for ([^@]+)@([^.]+)/);

          if (versionMatch) {
            return {
              title: 'Versão do Pacote não Encontrada',
              description: `Não foi possível encontrar a versão ${versionMatch[2]} do pacote ${versionMatch[1]}.`,
              severity: 'error',
              moduleName: versionMatch[1],
            };
          }

          // Verificar erros de módulo não encontrado
          const moduleMatch = output.match(/npm ERR! 404 Not Found - GET ([^ ]+)/);

          if (moduleMatch) {
            const moduleName = moduleMatch[1].split('/').pop()?.replace(/@.*$/, '') || 'unknown';
            return {
              title: 'Pacote não Encontrado',
              description: `O pacote ${moduleName} não foi encontrado no registro npm.`,
              severity: 'error',
              moduleName,
            };
          }

          // Verificar erros de permissão
          if (output.includes('npm ERR! code EACCES')) {
            return {
              title: 'Erro de Permissão',
              description: 'Não foi possível acessar o diretório devido a permissões insuficientes.',
              severity: 'error',
              moduleName: 'system',
            };
          }

          // Verificar erros de conexão
          if (output.includes('npm ERR! code ENOTFOUND') || output.includes('npm ERR! network')) {
            return {
              title: 'Erro de Rede',
              description: 'Não foi possível conectar ao registro npm. Verifique sua conexão com a internet.',
              severity: 'error',
              moduleName: 'network',
            };
          }

          return null;
        };

        // Função para verificar erros de esbuild
        const isEsbuildError = (output: string): boolean => {
          return output.includes('[esbuild]') && (output.includes('error:') || output.includes('failed to'));
        };

        // Função para verificar erros de módulo em eventos do previewer

        const checkForModuleError = (value: any): boolean => {
          if (!value || typeof value !== 'object') {
            return false;
          }

          if (typeof value === 'string') {
            return value.includes("Module not found: Can't resolve");
          }

          if (typeof value === 'object') {
            for (const key of ['message', 'error', 'text', 'content']) {
              if (
                value[key] &&
                typeof value[key] === 'string' &&
                value[key].includes("Module not found: Can't resolve")
              ) {
                return true;
              }
            }
          }

          return false;
        };

        // Listen for preview errors
        webcontainer.on('preview-message', (message: PreviewMessage) => {
          /*
           * Redução de logging para melhorar performance
           * console.log('WebContainer preview message:', message);
           */

          // Verificação mais rápida e direcionada para erros comuns
          if (message.type === 'PREVIEW_CONSOLE_ERROR') {
            const consoleMessage = message as ConsoleErrorMessage & BasePreviewMessage;

            // Verificação direta sem stringify do objeto inteiro
            if (Array.isArray(consoleMessage.args) && consoleMessage.args.length > 0) {
              const firstArg = consoleMessage.args[0];

              if (typeof firstArg === 'string' && firstArg.includes("Module not found: Can't resolve")) {
                // Processar erros de módulos com debouncing
                debouncedProcessErrors(firstArg);
                return; // Early return para evitar processamento adicional
              }
            }
          }

          // Verificação rápida para exceções e rejeições
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            const errorMessage = message as (UncaughtExceptionMessage | UnhandledRejectionMessage) & BasePreviewMessage;

            // Verificar diretamente nas propriedades relevantes apenas
            const errorText = errorMessage.message || '';
            const hasModuleError = errorText.includes("Module not found: Can't resolve");

            if (hasModuleError) {
              // Processar erros de módulos com debouncing
              debouncedProcessErrors(errorText);
              return; // Early return após processamento
            }

            /*
             * Criar alerta apenas para exceções não relacionadas a módulos
             * ou se o alerta anterior for antigo o suficiente
             */
            const errorSignature = `exception:${errorMessage.message?.substring(0, 100) || 'unknown'}`;
            const now = Date.now();

            // Verificar se já processamos esse erro recentemente
            if (processedModuleErrors.has(errorSignature)) {
              const lastTime = processedModuleErrors.get(errorSignature);

              if (now - lastTime! < 5000) {
                return; // Pular alertas duplicados para mesma exceção
              }
            }

            // Registrar este erro no cache
            processedModuleErrors.set(errorSignature, now);

            // Criar alerta para exceções não capturadas
            alertService.createAlert({
              type: 'preview',
              title: isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception',
              description: errorMessage.message || errorMessage.stack || 'Unknown error',
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(errorMessage.stack || '')}`,
              source: 'preview',
              severity: 'error',
            });

            return; // Early return para evitar processamento adicional
          }

          /*
           * Opcional: Verificação genérica mais rápida apenas para tipos não verificados acima
           * Esta verificação só será executada se as anteriores não forem acionadas
           */
          const messageType = (message as any).type; // Cast seguro para acessar type

          if (
            messageType !== 'PREVIEW_CONSOLE_ERROR' &&
            messageType !== 'PREVIEW_UNCAUGHT_EXCEPTION' &&
            messageType !== 'PREVIEW_UNHANDLED_REJECTION'
          ) {
            /*
             * Verificar apenas propriedades comuns onde erros de módulo podem aparecer
             * em vez de converter todo o objeto para string
             */
            const messageAny = message as any; // Cast para any para acessar propriedades dinamicamente

            if (
              checkForModuleError(messageAny.message) ||
              checkForModuleError(messageAny.data) ||
              checkForModuleError(messageAny.error)
            ) {
              // Extrair texto do erro para processamento
              let errorText = '';

              if (typeof messageAny.message === 'string' && messageAny.message.includes('Module not found')) {
                errorText = messageAny.message;
              } else if (typeof messageAny.data === 'string' && messageAny.data.includes('Module not found')) {
                errorText = messageAny.data;
              } else if (typeof messageAny.error === 'string' && messageAny.error.includes('Module not found')) {
                errorText = messageAny.error;
              } else {
                // Fallback genérico
                errorText = "Module not found: Can't resolve";
              }

              // Usar o sistema de debouncing e detecção de duplicatas
              debouncedProcessErrors(errorText);
            }
          }
        });

        return webcontainer;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
