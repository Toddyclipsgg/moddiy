import { setupConsoleErrorInterceptor, setupWindowErrorInterceptor } from './console-interceptor';

/**
 * Inicializa todos os interceptadores e configurações necessárias
 * para o funcionamento da aplicação
 */
export function bootstrapApp() {
  if (typeof window !== 'undefined') {
    // Configura interceptores de erro
    setupConsoleErrorInterceptor();
    setupWindowErrorInterceptor();

    console.info('🚀 Sistema de detecção de erros de módulos inicializado');
  }
}

// Auto-inicializa se não estiver em SSR
if (typeof window !== 'undefined') {
  bootstrapApp();
}
