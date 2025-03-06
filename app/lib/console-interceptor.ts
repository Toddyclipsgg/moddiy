import { processConsoleErrors } from '~/utils/shell';

/**
 * Intercepta os erros que aparecem no console para processá-los
 * e exibir em uma interface amigável
 */
export function setupConsoleErrorInterceptor() {
  // Salva a referência original do console.error
  const originalConsoleError = console.error;

  // Substitui console.error com uma função que intercepta mensagens
  console.error = function (...args) {
    // Chama o console.error original para preservar o comportamento normal
    originalConsoleError.apply(console, args);

    try {
      // Converte todos os argumentos para string para facilitar a busca
      const errorString = args
        .map((arg) => {
          if (typeof arg === 'string') {
            return arg;
          }

          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      // Verifica se a mensagem contém erros de módulos
      if (errorString.includes("Module not found: Can't resolve")) {
        processConsoleErrors(errorString);
      }
    } catch (e) {
      // Ignora erros na interceptação para não quebrar o console original
      originalConsoleError('Erro ao interceptar console.error:', e);
    }
  };

  // Retorna uma função para restaurar o console.error original se necessário
  return () => {
    console.error = originalConsoleError;
  };
}

// Adiciona interceptor para eventos de erro não capturados
export function setupWindowErrorInterceptor() {
  const errorHandler = (event: ErrorEvent) => {
    const errorMsg = event.message || 'Unknown error';
    const errorStack = event.error?.stack || '';

    const fullErrorInfo = `${errorMsg}\n${errorStack}`;

    if (fullErrorInfo.includes("Module not found: Can't resolve")) {
      processConsoleErrors(fullErrorInfo);
    }
  };

  // Adiciona listener para capturar erros não tratados
  window.addEventListener('error', errorHandler);

  // Adiciona listener para capturar rejeições de promessas não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = typeof reason === 'string' ? reason : reason?.message || 'Unknown rejection';

    if (reasonStr.includes("Module not found: Can't resolve")) {
      processConsoleErrors(reasonStr);
    }
  });

  // Retorna função para remover os listeners
  return () => {
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', errorHandler);
  };
}
