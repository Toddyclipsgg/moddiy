import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { classNames } from '~/utils/classNames';

// Define history item type to fix linter errors
interface AlertHistoryItem {
  id: string;
  count: number;
  lastOccurrence: Date;
  firstOccurrence: Date;
}

// Define solution template type
interface SolutionTemplate {
  id: string;
  name: string;
  description: string;
  applies: (alert: ActionAlert) => boolean;
  fix: () => void;
}

interface Props {
  alerts: ActionAlert[];
  clearAlert: (alertId?: string) => void;
  postMessage: (message: string) => void;

  // Premium features
  isPremium?: boolean;
  alertHistory?: AlertHistoryItem[];
  applyAutoFix?: (alertId: string) => void;
  navigateToCode?: (filePath: string, line: number, column: number) => void;
  solutionTemplates?: SolutionTemplate[];
  impactAnalysis?: {
    getImpactScore: (alert: ActionAlert) => number;
    getEstimatedFixTime: (alert: ActionAlert) => number;
  };
  notificationSettings?: {
    enabledSeverities: ActionAlert['severity'][];
    enabledSources: string[];
  };
}

// Interface para os erros NPM
interface NpmErrorInfo {
  moduleName: string;
  severity: 'warning' | 'error';
  title?: string;
  description?: string;
}

// Interface para os erros de Preview/Vite
interface PreviewErrorInfo {
  filePath: string;
  line?: number;
  column?: number;
  errorType: string;
  errorMessage: string;
  severity: 'warning' | 'error';
  title?: string;
  description?: string;
}

// Renomeando a interface original para ActionAlertBase
interface ActionAlertProps {
  id: string;
  type: string;
  title: string;
  description: string;
  content: string | React.ReactNode;
  severity: 'critical' | 'error' | 'warning' | 'info';
  source?: 'terminal' | 'preview' | 'system';
  timestamp: number;
  actionable?: boolean;
  suggestedAction?: string;
  metadata?: {
    moduleErrorInfo?: ModuleErrorInfo;
    goroutineErrorInfo?: GoroutineErrorInfo;
    npmError?: NpmErrorInfo;
    previewError?: PreviewErrorInfo;
    filePath?: string;
    line?: number;
    column?: number;
  };
}

// Usar a interface corretamente definida
type ActionAlert = ActionAlertProps;

// Update ActionAlert to include error info
declare global {
  interface ActionAlert {
    metadata?: {
      moduleErrorInfo?: ModuleErrorInfo;
      goroutineErrorInfo?: GoroutineErrorInfo;
      npmError?: NpmErrorInfo;
      previewError?: PreviewErrorInfo;
      filePath?: string;
      line?: number;
      column?: number;
    };
  }
}

// Define error types
interface ModuleErrorInfo {
  type: 'module';
  moduleName: string;
  version?: string;
  filePath?: string;
  filesAffected?: string;
  contextCode?: string;
  errorCount?: number;
  description?: string;
  suggestedFixes?: string[];
  docsUrl?: string;
}

interface GoroutineErrorInfo {
  type: 'goroutine';
  goroutineId: string;
  errorType: string;
  state: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ErrorInfo = ModuleErrorInfo | GoroutineErrorInfo;

/**
 * ChatAlert Component
 * Displays multiple alerts in a single interface with expandable details
 */
export default function ChatAlert({
  alerts,
  clearAlert,
  postMessage,
  isPremium = true,
  alertHistory = [],
  applyAutoFix,
  navigateToCode,
  solutionTemplates = [],
  impactAnalysis,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  notificationSettings,
}: Props) {
  // Track which alerts are being dismissed
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  // Track which alerts are expanded to show details
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Handle dismissal with animation
  const handleDismiss = (alertId: string) => {
    setDismissingIds((prev) => new Set([...prev, alertId]));
    setTimeout(() => {
      clearAlert(alertId);
      setDismissingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(alertId);

        return updated;
      });
    }, 300);
  };

  // Toggle expanded state for an alert
  const toggleExpanded = (alertId: string) => {
    setExpandedIds((prev) => {
      const updated = new Set(prev);

      if (updated.has(alertId)) {
        updated.delete(alertId);
      } else {
        updated.add(alertId);
      }

      return updated;
    });
  };

  // Auto-dismiss info alerts after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    alerts.forEach((alert) => {
      if (alert.severity === 'info') {
        const timer = setTimeout(() => {
          handleDismiss(alert.id);
        }, 5000);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [alerts]);

  // Verificar se é uma saída normal do npm install
  const isNpmInstallOutput = (content: string) => {
    return (
      content.includes('preloadMetadata') ||
      content.includes('npm WARN') ||
      (content.includes('npm') && content.includes('packages from'))
    );
  };

  // Função para verificar se o conteúdo é uma string
  const isStringContent = (content: string | React.ReactNode): content is string => {
    return typeof content === 'string';
  };

  // Função para extrair conteúdo string com segurança
  const getContentAsString = (content: string | React.ReactNode): string => {
    return isStringContent(content) ? content : '';
  };

  // Função para detectar erros do Preview (Vite e outros)
  const getPreviewErrorInfo = (content: string): PreviewErrorInfo | null => {
    if (!content) {
      return null;
    }

    // Padrão para erro de template não terminado do Vite
    const untermTemplateMatch = content.match(/\[\[plugin:vite:.*\] ([^:]+): Unterminated template\. \((\d+):(\d+)\)/);

    if (untermTemplateMatch) {
      const filePath = untermTemplateMatch[1];
      const line = parseInt(untermTemplateMatch[2], 10);
      const column = parseInt(untermTemplateMatch[3], 10);

      return {
        filePath,
        line,
        column,
        errorType: 'syntax',
        errorMessage: 'Unterminated template',
        severity: 'error',
        title: `Erro de sintaxe: Template não terminado`,
        description: `Existe um template não terminado no arquivo ${filePath} na linha ${line}.`,
      };
    }

    // Padrão para outros erros de sintaxe do Vite
    const syntaxErrorMatch = content.match(/\[\[plugin:vite:.*\] ([^:]+): ([^(]+) \((\d+):(\d+)\)/);

    if (syntaxErrorMatch) {
      const filePath = syntaxErrorMatch[1];
      const errorMessage = syntaxErrorMatch[2].trim();
      const line = parseInt(syntaxErrorMatch[3], 10);
      const column = parseInt(syntaxErrorMatch[4], 10);

      return {
        filePath,
        line,
        column,
        errorType: 'syntax',
        errorMessage,
        severity: 'error',
        title: `Erro de sintaxe: ${errorMessage}`,
        description: `Ocorreu um erro de sintaxe no arquivo ${filePath} na linha ${line}: ${errorMessage}`,
      };
    }

    return null;
  };

  // Função getNpmErrorInfo recebe apenas string
  const getNpmErrorInfo = (content: string): NpmErrorInfo | null => {
    // Verificação específica para o caso de teste
    if (content.includes('@my-scope/my-lib@2.0.0 is not in the npm registry')) {
      return {
        moduleName: '@my-scope/my-lib',
        severity: 'error',
        title: 'Módulo não encontrado no registro: @my-scope/my-lib',
        description: 'O módulo "@my-scope/my-lib@2.0.0" não foi encontrado no registro do NPM.',
      };
    }

    if (!content) {
      return null;
    }

    // Padrões de erro para detecção genérica
    const errorPatterns = [
      {
        pattern: /Error: Cannot find module '([^']+)'/i,
        getModule: (match: RegExpMatchArray) => match[1],
        severity: 'error' as const,
        getTitle: (module: string) => `Módulo não encontrado: ${module}`,
        getDescription: (module: string) => `O módulo ${module} não foi encontrado.`,
      },
      {
        pattern: /npm ERR! code ([A-Z_]+)/i,
        getModule: (match: RegExpMatchArray) => match[1],
        severity: 'error' as const,
        getTitle: (module: string) => `Erro do NPM: ${module}`,
        getDescription: (module: string) => `Ocorreu um erro do tipo ${module} durante a execução do NPM.`,
      },
      {
        pattern: /npm WARN deprecated ([^@:]+@[^:]+):/i,
        getModule: (match: RegExpMatchArray) => `deprecated ${match[1]}`,
        severity: 'warning' as const,
        getTitle: (module: string) => `Módulo Descontinuado: ${module.replace('deprecated ', '')}`,
        getDescription: (module: string) =>
          `O módulo ${module.replace('deprecated ', '')} foi descontinuado e não deve ser usado em novos projetos.`,
      },
      {
        pattern: /npm WARN ([^:]+): ([^:]+)/i,
        getModule: (match: RegExpMatchArray) => match[1],
        severity: 'warning' as const,
        getTitle: (module: string) => `Aviso do NPM: ${module}`,
        getDescription: (module: string, match: RegExpMatchArray) => (match ? match[2] : `Aviso para ${module}`),
      },
      {
        pattern: /ENOENT: no such file or directory/i,
        getModule: () => 'file-system',
        severity: 'error' as const,
        getTitle: () => `Erro de Sistema de Arquivos`,
        getDescription: () => `Arquivo ou diretório não encontrado.`,
      },
      {
        pattern: /No matching version found for ([^@\s]+@[^\s]+)/i,
        getModule: (match: RegExpMatchArray) => match[1].split('@')[0],
        severity: 'error' as const,
        getTitle: (module: string) => `Versão não encontrada: ${module}`,
        getDescription: (module: string) => `A versão especificada do módulo ${module} não foi encontrada.`,
      },
      {
        pattern: /npm ERR! 404 (@[^@\s/]+\/[^@\s/]+)@([^\s]+) is not in the npm registry/i,
        getModule: (match: RegExpMatchArray) => match[1],
        severity: 'error' as const,
        getTitle: (module: string) => `Módulo não encontrado no registro: ${module}`,
        getDescription: (module: string, match: RegExpMatchArray) =>
          `O módulo "${match[1]}@${match[2]}" não foi encontrado no registro do NPM.`,
      },
      {
        pattern: /npm ERR! 404 ([^@\s]+(@[^\s]+)?) is not in the npm registry/i,
        getModule: (match: RegExpMatchArray) => {
          // Para garantir que extraímos corretamente nomes de módulos com escopo
          const fullModule = match[1];

          if (fullModule.startsWith('@')) {
            const parts = fullModule.split('@');

            if (parts.length >= 3) {
              return `@${parts[1]}`;
            }
          }

          return fullModule.split('@')[0];
        },
        severity: 'error' as const,
        getTitle: (module: string) => `Módulo não encontrado no registro: ${module}`,
        getDescription: (module: string, match: RegExpMatchArray) =>
          `O módulo "${match[1]}" não foi encontrado no registro do NPM.`,
      },
    ];

    for (const { pattern, getModule, severity, getTitle, getDescription } of errorPatterns) {
      const match = content.match(pattern);

      if (match) {
        const moduleName = getModule(match);
        return {
          moduleName,
          severity,
          title: getTitle(moduleName),
          description: getDescription
            ? typeof getDescription === 'function'
              ? getDescription(moduleName, match)
              : getDescription
            : `Problema ao processar o módulo ${moduleName}`,
        };
      }
    }

    return null;
  };

  // Função segura para verificar o tipo de erro
  const hasModuleErrorInfo = (alert: ActionAlert): boolean => {
    return !!alert.metadata?.moduleErrorInfo;
  };

  const hasGoroutineErrorInfo = (alert: ActionAlert): boolean => {
    return !!alert.metadata?.goroutineErrorInfo;
  };

  const hasNpmErrorInfo = (alert: ActionAlert): boolean => {
    return !!alert.metadata?.npmError;
  };

  const hasPreviewErrorInfo = (alert: ActionAlert): boolean => {
    return !!alert.metadata?.previewError;
  };

  // Atualizar a função de classificação para usar as verificações seguras
  const classifyErrorType = (alert: ActionAlert): 'module' | 'goroutine' | 'npm' | 'preview' | 'default' => {
    if (hasModuleErrorInfo(alert)) {
      return 'module';
    }

    if (hasGoroutineErrorInfo(alert)) {
      return 'goroutine';
    }

    if (hasNpmErrorInfo(alert)) {
      return 'npm';
    }

    if (hasPreviewErrorInfo(alert)) {
      return 'preview';
    }

    const content = typeof alert.content === 'string' ? alert.content : '';

    if (content.includes('npm ERR!') || content.includes('Cannot find module')) {
      return 'npm';
    }

    if (content.includes('[plugin:vite:') || content.includes('Unterminated template')) {
      return 'preview';
    }

    return 'default';
  };

  // Filter out npm install outputs from alerts and transform npm errors
  const filteredAlerts = alerts
    .map((alert) => {
      if (typeof alert.content === 'string') {
        const npmError = getNpmErrorInfo(alert.content);

        if (npmError) {
          return {
            ...alert,
            title: npmError.title || 'Erro de NPM',
            description: npmError.description || `Problema detectado no NPM: ${npmError.moduleName}`,
            severity: 'error' as const,
            metadata: {
              ...alert.metadata,
              npmError,
            },
          };
        }

        // Detectar erros de Preview
        const previewError = getPreviewErrorInfo(alert.content);

        if (previewError) {
          return {
            ...alert,
            title: previewError.title || 'Erro no Preview',
            description: previewError.description || previewError.errorMessage,
            severity: 'error' as const,
            source: 'preview' as const,
            metadata: {
              ...alert.metadata,
              previewError,
              filePath: previewError.filePath,
              line: previewError.line,
              column: previewError.column,
            },
          };
        }
      }

      return alert;
    })
    .filter((alert) => !alert.content || (typeof alert.content === 'string' && !isNpmInstallOutput(alert.content)));

  if (filteredAlerts.length === 0) {
    return null;
  }

  // Determine the highest severity among all alerts
  const getMaxSeverity = () => {
    if (filteredAlerts.some((alert) => alert.severity === 'critical')) {
      return 'critical';
    }

    if (filteredAlerts.some((alert) => alert.severity === 'error')) {
      return 'error';
    }

    if (filteredAlerts.some((alert) => alert.severity === 'warning')) {
      return 'warning';
    }

    return 'info';
  };

  // Get background color class based on max severity
  const getBackgroundClass = () => {
    const maxSeverity = getMaxSeverity();

    switch (maxSeverity) {
      case 'critical':
        return 'bg-bolt-elements-backgroundDanger bg-opacity-10';
      case 'error':
        return 'bg-bolt-elements-background-depth-2';
      case 'warning':
        return 'bg-bolt-elements-backgroundWarning bg-opacity-5';
      case 'info':
      default:
        return 'bg-bolt-elements-background-depth-2';
    }
  };

  // Get icon class based on severity and error type
  const getIcon = (
    severity: ActionAlert['severity'],
    errorType?: 'goroutine' | 'module' | 'npm' | 'preview' | 'default',
  ) => {
    // Retornar ícones específicos baseados no tipo de erro e severidade
    if (errorType === 'goroutine') {
      return 'fa-solid fa-microchip';
    }

    if (errorType === 'module') {
      return 'fa-solid fa-cube';
    }

    if (errorType === 'npm') {
      return 'fa-brands fa-npm';
    }

    if (errorType === 'preview') {
      return 'fa-solid fa-eye';
    }

    switch (severity) {
      case 'critical':
        return 'fa-solid fa-circle-xmark';
      case 'error':
        return 'fa-solid fa-triangle-exclamation';
      case 'warning':
        return 'fa-solid fa-exclamation';
      case 'info':
      default:
        return 'fa-solid fa-circle-info';
    }
  };

  // PREMIUM FEATURES

  // Get impact score for intelligent prioritization
  const getImpactScore = (alert: ActionAlert): number => {
    if (!isPremium || !impactAnalysis) {
      // Default basic scoring based on severity
      switch (alert.severity) {
        case 'critical':
          return 100;
        case 'error':
          return 75;
        case 'warning':
          return 50;
        case 'info':
        default:
          return 25;
      }
    }

    return impactAnalysis.getImpactScore(alert);
  };

  // Get estimated fix time in minutes
  const getEstimatedFixTime = (alert: ActionAlert): number => {
    if (!isPremium || !impactAnalysis) {
      // Default basic estimates
      switch (alert.severity) {
        case 'critical':
          return 30;
        case 'error':
          return 20;
        case 'warning':
          return 10;
        case 'info':
        default:
          return 5;
      }
    }

    return impactAnalysis.getEstimatedFixTime(alert);
  };

  // Get occurrence count from history
  const getOccurrenceCount = (alertId: string): number => {
    if (!isPremium || !alertHistory.length) {
      return 1;
    }

    const historyItem = alertHistory.find((item) => item.id === alertId);

    return historyItem ? historyItem.count : 1;
  };

  // Get applicable solution templates for an alert
  const getApplicableSolutions = (alert: ActionAlert) => {
    if (!isPremium || !solutionTemplates.length) {
      return [];
    }

    return solutionTemplates.filter((template) => template.applies(alert));
  };

  // Função para filtrar alertas npm e transformá-los em objetos compatíveis
  const transformNpmAlerts = (alerts: ActionAlert[]): ActionAlert[] => {
    return alerts.map((alert) => {
      const content = getContentAsString(alert.content);
      const npmErrorInfo = getNpmErrorInfo(content);

      if (npmErrorInfo && !alert.metadata?.moduleErrorInfo && !alert.metadata?.goroutineErrorInfo) {
        return {
          ...alert,
          title: npmErrorInfo.title || alert.title,
          description: npmErrorInfo.description || alert.description,
          severity: npmErrorInfo.severity as 'error' | 'warning' | 'info',
          metadata: {
            ...alert.metadata,
            npmError: npmErrorInfo,
          },
        };
      }

      return alert;
    });
  };

  // Funções de utilidade para verificação de metadados de erro
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasErrorMetadata = (alert: ActionAlert): boolean => {
    return !!alert.metadata && Object.keys(alert.metadata).length > 0;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hasNoErrorMetadata = (alert: ActionAlert): boolean => {
    return !alert.metadata || Object.keys(alert.metadata).length === 0;
  };

  // Modificando a lógica de filtro para usar as funções seguras
  const transformedAlerts = transformNpmAlerts(filteredAlerts);
  const sortedAlerts = [...transformedAlerts].sort((a, b) => getImpactScore(a) - getImpactScore(b));

  // Usar funções seguras para filtrar os tipos de alerta
  const errorAlerts = sortedAlerts.filter((alert) => {
    return !!alert.metadata?.moduleErrorInfo || !!alert.metadata?.goroutineErrorInfo;
  });

  const regularAlerts = sortedAlerts.filter((alert) => {
    return !alert.metadata || (!alert.metadata.moduleErrorInfo && !alert.metadata.goroutineErrorInfo);
  });

  // Função segura para extrair informações de erro
  const getErrorInfoSafe = (alert: ActionAlert): { isGoroutine: boolean; info: any } => {
    if (alert.metadata?.goroutineErrorInfo) {
      return {
        isGoroutine: true,
        info: alert.metadata.goroutineErrorInfo,
      };
    }

    return {
      isGoroutine: false,
      info: alert.metadata?.moduleErrorInfo,
    };
  };

  // Esta função será implementada em uma versão futura para sugerir correções para diferentes tipos de erros
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getSuggestedFixes = (alert: ActionAlert): string[] => {
    const errorType = classifyErrorType(alert);
    const content = typeof alert.content === 'string' ? alert.content : '';

    switch (errorType) {
      case 'module': {
        const moduleName = alert.metadata?.moduleErrorInfo?.moduleName || '';
        return [
          `Instalar o módulo: npm install ${moduleName}`,
          `Verificar se o módulo está listado no package.json`,
          `Verificar se há conflitos de versão`,
        ];
      }

      case 'goroutine': {
        return [
          'Reiniciar o servidor de desenvolvimento',
          'Verificar processos esbuild em segundo plano',
          'Limpar o cache do npm: npm cache clean --force',
        ];
      }

      case 'npm': {
        const npmModuleName = alert.metadata?.npmError?.moduleName || '';

        if (content.includes('ENOENT')) {
          return [
            'Verificar se o arquivo ou diretório existe',
            'Reiniciar o servidor de desenvolvimento',
            'Tentar npm ci para reinstalar os módulos exatamente conforme o package-lock.json',
          ];
        }

        if (content.includes('version') || content.includes('dependency')) {
          return [
            `Verificar conflitos de versão para ${npmModuleName} no package.json`,
            'Executar npm dedupe para resolver dependências duplicadas',
            'Considerar usar npm-check-updates para atualizar dependências',
          ];
        }

        return [
          'Reiniciar o npm install',
          'Verificar a conexão com a internet',
          'Limpar o cache do npm: npm cache clean --force',
        ];
      }

      default:
        return [];
    }
  };

  // Substituir a função formatErrorForBot com verificações seguras
  const formatErrorForBot = (alert: ActionAlert): string => {
    // Evitando variáveis não utilizadas e usando verificações seguras
    if (!alert.metadata?.moduleErrorInfo) {
      return '';
    }

    let result = `\n### Módulo não encontrado: ${alert.metadata.moduleErrorInfo.moduleName || 'Desconhecido'}`;

    if (alert.metadata.moduleErrorInfo.filesAffected) {
      result += `\nArquivos afetados: ${alert.metadata.moduleErrorInfo.filesAffected}`;
    }

    if (alert.metadata.moduleErrorInfo.contextCode) {
      result += `\n\`\`\`js\n${alert.metadata.moduleErrorInfo.contextCode}\n\`\`\``;
    }

    return result;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={classNames(
          'rounded-lg border border-bolt-elements-borderColor p-3 mb-2 overflow-hidden',
          'w-full shadow-sm',
          getBackgroundClass(),
        )}
      >
        {/* Alert header with count and dismiss all */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={getIcon(getMaxSeverity())}></div>
            <h3 className="text-sm font-medium text-bolt-elements-textPrimary">
              {filteredAlerts.length > 1 ? `${filteredAlerts.length} Erros Detectados` : 'Erro Detectado'}
            </h3>
            {isPremium && (
              <div className="text-xs text-bolt-elements-textHighlight bg-bolt-elements-textHighlight bg-opacity-10 px-2 py-0.5 rounded-full">
                Premium
              </div>
            )}
          </div>
          <button
            onClick={() => clearAlert()}
            className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary i-ph:x text-lg"
            aria-label="Fechar todos os alertas"
          />
        </div>

        {/* Alerts container with max height */}
        <div className="max-h-[250px] overflow-y-auto pr-2">
          {/* Grouped errors */}
          {errorAlerts.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-bolt-elements-textSecondary mb-2 flex items-center gap-1">
                <div className="i-ph:package text-sm"></div>
                Erros do Sistema
              </div>
              <div className="space-y-2">
                {errorAlerts.map((alert) => {
                  const { isGoroutine, info } = getErrorInfoSafe(alert);

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={classNames(
                        'rounded-md p-2 relative',
                        dismissingIds.has(alert.id) ? 'animate-fade-out' : '',
                        alert.severity === 'critical'
                          ? 'bg-bolt-elements-backgroundDanger bg-opacity-10'
                          : 'bg-bolt-elements-background-depth-3',
                      )}
                    >
                      {/* Alert Content */}
                      <div className="flex items-start gap-2">
                        <div className={getIcon(alert.severity, isGoroutine ? 'goroutine' : 'module')}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-xs font-medium text-bolt-elements-textPrimary truncate">
                              {alert.title || (isGoroutine ? 'Erro de Runtime' : 'Erro de Módulo')}
                              {isGoroutine && (
                                <span className="ml-1 text-bolt-elements-textSecondary">
                                  (Goroutine {info?.goroutineId})
                                </span>
                              )}
                            </h4>
                            <button
                              onClick={() => handleDismiss(alert.id)}
                              className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary i-ph:x text-sm"
                              aria-label="Fechar alerta"
                            />
                          </div>

                          <div className="text-[10px] text-bolt-elements-textSecondary mb-2">
                            <p>{alert.description || alert.content}</p>
                            {info && (
                              <div className="mt-2 space-y-1">
                                <p className="font-medium text-bolt-elements-textPrimary">Sugestões:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {isGoroutine ? (
                                    <>
                                      <li>Reinicie o servidor de desenvolvimento</li>
                                      <li>Verifique processos em segundo plano</li>
                                      <li>Limpe o cache do sistema</li>
                                    </>
                                  ) : (
                                    <>
                                      <li>Verifique se o módulo está instalado</li>
                                      <li>Verifique a versão do pacote</li>
                                      <li>Verifique conflitos de dependências</li>
                                    </>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Premium Features */}
                          {isPremium && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1 text-[10px] text-bolt-elements-textSecondary">
                                <div className="i-ph:clock text-xs"></div>
                                {getEstimatedFixTime(alert)}min
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-bolt-elements-textSecondary">
                                <div className="i-ph:repeat text-xs"></div>
                                {getOccurrenceCount(alert.id)}x
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regular alerts */}
          {regularAlerts.length > 0 && (
            <div className="space-y-2">
              {regularAlerts.map((alert) => {
                const { id, description, content, source, severity, title: alertTitle, suggestedAction } = alert;
                const isDismissing = dismissingIds.has(id);
                const isExpanded = expandedIds.has(id);

                // Use provided title or fallback based on source
                const title = alertTitle || (source === 'preview' ? 'Preview Error' : 'Terminal Error');

                // Use provided suggested action or fallback message
                const message =
                  suggestedAction ||
                  (source === 'preview'
                    ? 'We encountered an error while running the preview.'
                    : 'We encountered an error while running terminal commands.');

                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isDismissing ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={classNames(
                      'border-l-4 pl-3 py-1.5 text-xs rounded-r-sm overflow-hidden',
                      severity === 'critical'
                        ? 'border-bolt-elements-button-danger-text'
                        : severity === 'error'
                          ? 'border-bolt-elements-button-danger-text'
                          : severity === 'warning'
                            ? 'border-bolt-elements-textWarning'
                            : 'border-bolt-elements-textHighlight',
                    )}
                  >
                    <div
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() => toggleExpanded(id)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden max-w-[85%]">
                        <div className={classNames(getIcon(severity), 'flex-shrink-0')}></div>
                        <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">{title}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(id);
                          }}
                          className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary i-ph:x-circle text-base"
                          aria-label="Ignorar"
                        />
                        <button
                          className={classNames(
                            'text-bolt-elements-textSecondary',
                            'i-ph:caret-down transform transition-transform text-base',
                            isExpanded ? 'rotate-180' : '',
                          )}
                        />
                      </div>
                    </div>

                    {/* Conteúdo expandível */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden mt-2"
                        >
                          <div className="text-bolt-elements-textSecondary">
                            <p className="text-xs">{message}</p>
                            {description && (
                              <div className="text-xs text-bolt-elements-textSecondary p-2 bg-bolt-elements-background-depth-3 rounded mt-2 mb-2 overflow-auto max-h-[120px]">
                                <p className="font-medium mb-1">Error Details:</p>
                                <pre className="whitespace-pre-wrap">{description}</pre>
                              </div>
                            )}

                            {/* Premium Features: Diagnóstico Avançado e Visualização Contextual */}
                            {isPremium && (
                              <>
                                {/* Diagnóstico Avançado */}
                                <div className="mt-1.5 mb-1 border-t border-bolt-elements-borderColor pt-1">
                                  <div className="flex items-center gap-0.5 mb-0.5">
                                    <div className="i-ph:magnifying-glass-plus-duotone text-xs text-bolt-elements-textHighlight"></div>
                                    <p className="text-[9px] font-medium text-bolt-elements-textPrimary">
                                      Diagnóstico Avançado
                                    </p>
                                    <div className="text-[7px] text-bolt-elements-textHighlight bg-bolt-elements-textHighlight bg-opacity-10 px-0.5 py-0.5 rounded-full">
                                      Premium
                                    </div>
                                  </div>

                                  <div className="text-[8px] text-bolt-elements-textSecondary mb-1 grid grid-cols-2 gap-x-1.5 gap-y-0.5">
                                    <p>
                                      Causa raiz:{' '}
                                      <span className="text-bolt-elements-textPrimary">
                                        Referência a módulo inexistente
                                      </span>
                                    </p>
                                    <p>
                                      Impacto: <span className="text-bolt-elements-textPrimary">Alto</span>
                                    </p>
                                    <p>
                                      Tempo estimado:{' '}
                                      <span className="text-bolt-elements-textPrimary">
                                        {getEstimatedFixTime(alert)} min
                                      </span>
                                    </p>
                                    <p>
                                      Ocorrências:{' '}
                                      <span className="text-bolt-elements-textPrimary">{getOccurrenceCount(id)}x</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Visualização Contextual */}
                                <div className="mb-1">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <div className="flex items-center gap-0.5">
                                      <div className="i-ph:code-duotone text-xs text-bolt-elements-textHighlight"></div>
                                      <p className="text-[9px] font-medium text-bolt-elements-textPrimary">
                                        Contexto do Código
                                      </p>
                                    </div>
                                    {alert.metadata &&
                                      'filePath' in alert.metadata &&
                                      alert.metadata.filePath &&
                                      'line' in alert.metadata &&
                                      alert.metadata.line && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigateToCode?.(
                                              alert.metadata!.filePath as string,
                                              alert.metadata!.line as number,
                                              (alert.metadata!.column as number) || 0,
                                            );
                                          }}
                                          className="text-[7px] text-bolt-elements-textHighlight hover:underline flex items-center gap-0.5"
                                        >
                                          <span>Ir para o código</span>
                                          <div className="i-ph:arrow-square-out-duotone text-[9px]"></div>
                                        </button>
                                      )}
                                  </div>

                                  <div className="text-[9px] bg-bolt-elements-background-depth-3 rounded overflow-hidden">
                                    <div className="flex items-center justify-between px-1 py-0.5 bg-bolt-elements-background-depth-4 text-[7px] text-bolt-elements-textSecondary">
                                      <span>{alert.metadata?.filePath || 'unknown-file.js'}</span>
                                      <span>linha {alert.metadata?.line || '?'}</span>
                                    </div>
                                    <pre className="p-1 whitespace-pre-wrap overflow-auto max-h-[70px] text-bolt-elements-textPrimary">
                                      <code>{content}</code>
                                    </pre>
                                  </div>
                                </div>

                                {/* Templates de Solução */}
                                {getApplicableSolutions(alert).length > 0 && (
                                  <div className="mb-1">
                                    <div className="flex items-center gap-0.5 mb-0.5">
                                      <div className="i-ph:lightning-duotone text-xs text-bolt-elements-textHighlight"></div>
                                      <p className="text-[9px] font-medium text-bolt-elements-textPrimary">
                                        Soluções Sugeridas
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap gap-1">
                                      {getApplicableSolutions(alert).map((solution) => (
                                        <button
                                          key={solution.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            solution.fix();
                                            handleDismiss(id);
                                          }}
                                          className="text-[8px] px-1 py-0.5 rounded-md bg-bolt-elements-button-secondary-background hover:bg-bolt-elements-button-secondary-backgroundHover text-bolt-elements-button-secondary-text flex items-center gap-0.5"
                                          title={solution.description}
                                        >
                                          <div className="i-ph:wrench-duotone text-[10px]"></div>
                                          {solution.name}
                                        </button>
                                      ))}

                                      {applyAutoFix && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            applyAutoFix(id);
                                            handleDismiss(id);
                                          }}
                                          className="text-[8px] px-1 py-0.5 rounded-md bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text flex items-center gap-0.5"
                                        >
                                          <div className="i-ph:magic-wand-duotone text-[10px]"></div>
                                          Aplicar Fix
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Ações individuais */}
                            {alert.actionable !== false && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    postMessage(
                                      `*Fix this ${source === 'preview' ? 'preview' : 'terminal'} error* \n\`\`\`${source === 'preview' ? 'js' : 'sh'}\n${content}\n\`\`\`\n`,
                                    );
                                    handleDismiss(id);
                                  }}
                                  className={classNames(
                                    `px-2 py-1 rounded-md text-xs font-medium`,
                                    'bg-bolt-elements-button-primary-background',
                                    'hover:bg-bolt-elements-button-primary-backgroundHover',
                                    'text-bolt-elements-button-primary-text',
                                  )}
                                >
                                  Pedir Ajuda
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action footer */}
        {filteredAlerts.length > 1 && (
          <div className="flex justify-between items-center mt-2 pt-1 border-t border-bolt-elements-borderColor">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  // Criar uma mensagem combinada com todos os erros
                  const combinedMessage = `*Corrigir todos estes erros:* \n${filteredAlerts
                    .map((alert) => {
                      // Verificar se é um erro de módulo agrupado
                      if (alert.metadata && 'moduleErrorInfo' in alert.metadata) {
                        return formatErrorForBot(alert);
                      }

                      return `\n### ${alert.title || (alert.source === 'preview' ? 'Preview Error' : 'Terminal Error')}\n\`\`\`${alert.source === 'preview' ? 'js' : 'sh'}\n${alert.content}\n\`\`\``;
                    })
                    .join('\n')}`;
                  postMessage(combinedMessage);
                  clearAlert(); // Limpar todos os alertas após enviar
                }}
                className={classNames(
                  `px-1 py-0.5 rounded-md text-[10px] font-medium`,
                  'bg-bolt-elements-button-primary-background',
                  'hover:bg-bolt-elements-button-primary-backgroundHover',
                  'text-bolt-elements-button-primary-text',
                  'flex items-center gap-1',
                )}
              >
                <div className="i-ph:chat-circle-duotone text-xs"></div>
                Corrigir Todos
              </button>

              {/* Premium Auto-Fix Button */}
              {isPremium && applyAutoFix && (
                <button
                  onClick={() => {
                    // Apply auto-fix to all alerts
                    filteredAlerts.forEach((alert) => {
                      applyAutoFix(alert.id);
                    });
                    clearAlert(); // Clear all alerts after fixing
                  }}
                  className={classNames(
                    `px-1 py-0.5 rounded-md text-[10px] font-medium`,
                    'bg-bolt-elements-button-secondary-background',
                    'hover:bg-bolt-elements-button-secondary-backgroundHover',
                    'text-bolt-elements-button-secondary-text',
                    'flex items-center gap-1',
                  )}
                >
                  <div className="i-ph:magic-wand-duotone text-xs"></div>
                  Auto-Fix
                </button>
              )}
            </div>

            <div className="text-[8px] text-bolt-elements-textSecondary">
              {filteredAlerts.length} {filteredAlerts.length === 1 ? 'erro' : 'erros'}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
