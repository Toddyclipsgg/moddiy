import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ActionAlert } from '~/types/actions';
import { classNames } from '~/utils/classNames';

interface Props {
  alerts: ActionAlert[];
  clearAlert: (alertId?: string) => void;
  postMessage: (message: string) => void;
}

/**
 * ChatAlert Component
 * Displays multiple alerts in a single interface with expandable details
 */
export default function ChatAlert({ alerts, clearAlert, postMessage }: Props) {
  // Track which alerts are being dismissed
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());
  // Track which alerts are expanded to show details
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Handle dismissal with animation
  const handleDismiss = (alertId: string) => {
    setDismissingIds(prev => new Set([...prev, alertId]));
    setTimeout(() => {
      clearAlert(alertId);
      setDismissingIds(prev => {
        const updated = new Set(prev);
        updated.delete(alertId);
        return updated;
      });
    }, 300);
  };

  // Toggle expanded state for an alert
  const toggleExpanded = (alertId: string) => {
    setExpandedIds(prev => {
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
    
    alerts.forEach(alert => {
      if (alert.severity === 'info') {
        const timer = setTimeout(() => {
          handleDismiss(alert.id);
        }, 5000);
        timers.push(timer);
      }
    });
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [alerts]);

  if (alerts.length === 0) {
    return null;
  }

  // Determine the highest severity among all alerts
  const getMaxSeverity = () => {
    if (alerts.some(alert => alert.severity === 'critical')) return 'critical';
    if (alerts.some(alert => alert.severity === 'error')) return 'error';
    if (alerts.some(alert => alert.severity === 'warning')) return 'warning';
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

  // Get icon class based on severity
  const getIcon = (severity: ActionAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'i-ph:warning-octagon-fill text-xl text-bolt-elements-button-danger-text';
      case 'error':
        return 'i-ph:warning-duotone text-xl text-bolt-elements-button-danger-text';
      case 'warning':
        return 'i-ph:warning-circle-duotone text-xl text-bolt-elements-textWarning';
      case 'info':
      default:
        return 'i-ph:info-duotone text-xl text-bolt-elements-textHighlight';
    }
  };

  // Verificar se temos erros de mÃ³dulos para agrupar
  const moduleErrorAlerts = alerts.filter(alert => 
    alert.metadata && 'moduleErrorInfo' in alert.metadata);
  
  // Separar alertas normais
  const regularAlerts = alerts.filter(alert => 
    !alert.metadata || !('moduleErrorInfo' in alert.metadata));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={classNames(
          'rounded-lg border border-bolt-elements-borderColor p-4 mb-2',
          getBackgroundClass()
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className={getIcon(getMaxSeverity())}></div>
            <h3 className="ml-2 text-sm font-medium text-bolt-elements-textPrimary">
              {alerts.length > 1 ? `${alerts.length} Erros Detectados` : 'Erro Detectado'}
            </h3>
          </div>
        </div>
        
        {/* Erros de mÃ³dulos agrupados */}
        {moduleErrorAlerts.length > 0 && (
          <div className="mb-4 border-b border-bolt-elements-borderColor pb-3">
            <h4 className="text-sm font-semibold mb-2 text-bolt-elements-textPrimary">
              Erros de MÃ³dulos NÃ£o Encontrados
            </h4>
            <div className="space-y-3">
              {moduleErrorAlerts.map(alert => {
                const { id } = alert;
                const isDismissing = dismissingIds.has(id);
                const isExpanded = expandedIds.has(id);
                
                // Extract module error info
                const moduleInfo = alert.metadata?.moduleErrorInfo;
                if (!moduleInfo) return null;
                
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isDismissing ? 0 : 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-l-4 border-bolt-elements-button-danger-text pl-3 py-2"
                  >
                    <div 
                      className="flex justify-between items-center cursor-pointer" 
                      onClick={() => toggleExpanded(id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="i-ph:code-duotone text-lg text-bolt-elements-button-danger-text"></div>
                        <span className="font-medium text-sm">
                          MÃ³dulo nÃ£o encontrado: {moduleInfo.moduleName}
                          {moduleInfo.errorCount > 1 && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-bolt-elements-button-danger-text bg-opacity-20 text-bolt-elements-button-danger-text rounded-full">
                              {moduleInfo.errorCount} arquivos
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {alert.timestamp && (
                          <span className="text-xs text-bolt-elements-textSecondary">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                        <button 
                          className={classNames(
                            "text-bolt-elements-textSecondary",
                            "i-ph:caret-down transform transition-transform",
                            isExpanded ? "rotate-180" : ""
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* ConteÃºdo expandÃ­vel do erro de mÃ³dulo */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 text-sm text-bolt-elements-textSecondary">
                            <p>{moduleInfo.description}</p>
                            
                            <div className="mt-2 mb-2">
                              <p className="font-medium text-xs">Arquivos afetados:</p>
                              <p className="text-xs">{moduleInfo.filesAffected}</p>
                            </div>
                            
                            <div className="text-xs text-bolt-elements-textSecondary p-2 bg-bolt-elements-background-depth-3 rounded mt-2 mb-3 overflow-auto max-h-[150px]">
                              <pre className="whitespace-pre-wrap">{moduleInfo.contextCode}</pre>
                            </div>
                            
                            {/* SugestÃµes de resoluÃ§Ã£o */}
                            {moduleInfo.suggestedFixes && moduleInfo.suggestedFixes.length > 0 && (
                              <div className="mt-2 mb-2">
                                <p className="font-medium text-xs mb-1">SugestÃµes:</p>
                                <ul className="list-disc pl-5 text-xs space-y-1">
                                  {moduleInfo.suggestedFixes.map((fix: string, idx: number) => (
                                    <li key={idx}>{fix}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* DocumentaÃ§Ã£o */}
                            {moduleInfo.docsUrl && (
                              <div className="mt-2 text-xs">
                                <a 
                                  href={moduleInfo.docsUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-bolt-elements-textHighlight hover:underline"
                                >
                                  Ver documentaÃ§Ã£o
                                </a>
                              </div>
                            )}
                            
                            {/* AÃ§Ãµes individuais */}
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  postMessage(
                                    `*Resolver problema com o mÃ³dulo '${moduleInfo.moduleName}'*\n\nO mÃ³dulo ${moduleInfo.moduleName} nÃ£o foi encontrado nos seguintes arquivos:\n\`\`\`\n${moduleInfo.filesAffected}\n\`\`\`\n\nCÃ³digo contexto:\n\`\`\`js\n${moduleInfo.contextCode}\n\`\`\`\n\nComo posso resolver este problema?`,
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismiss(id);
                                }}
                                className={classNames(
                                  `px-2 py-1 rounded-md text-xs font-medium`,
                                  'bg-bolt-elements-button-secondary-background',
                                  'hover:bg-bolt-elements-button-secondary-backgroundHover',
                                  'text-bolt-elements-button-secondary-text',
                                )}
                              >
                                Ignorar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Lista de alertas regulares */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          {regularAlerts.map(alert => {
            const { id, description, content, source, severity, title: alertTitle, suggestedAction } = alert;
            const isDismissing = dismissingIds.has(id);
            const isExpanded = expandedIds.has(id);
            
            // Use provided title or fallback based on source
            const title = alertTitle || (source === 'preview' ? 'Preview Error' : 'Terminal Error');
            
            // Use provided suggested action or fallback message
            const message = suggestedAction || (source === 'preview'
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
                  'border-l-4 pl-3 py-2',
                  severity === 'critical' ? 'border-bolt-elements-button-danger-text' :
                  severity === 'error' ? 'border-bolt-elements-button-danger-text' :
                  severity === 'warning' ? 'border-bolt-elements-textWarning' :
                  'border-bolt-elements-textHighlight'
                )}
              >
                <div 
                  className="flex justify-between items-center cursor-pointer" 
                  onClick={() => toggleExpanded(id)}
                >
                  <div className="flex items-center gap-2">
                    <div className={getIcon(severity)}></div>
                    <span className="font-medium text-sm">{title}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {alert.timestamp && (
                      <span className="text-xs text-bolt-elements-textSecondary">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                    <button 
                      className={classNames(
                        "text-bolt-elements-textSecondary",
                        "i-ph:caret-down transform transition-transform",
                        isExpanded ? "rotate-180" : ""
                      )}
                    />
                  </div>
                </div>
                
                {/* ConteÃºdo expandÃ­vel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 text-sm text-bolt-elements-textSecondary">
                        <p>{message}</p>
                        {description && (
                          <div className="text-xs text-bolt-elements-textSecondary p-2 bg-bolt-elements-background-depth-3 rounded mt-2 mb-3 overflow-auto max-h-[150px]">
                            <p className="font-medium mb-1">Error Details:</p>
                            <pre className="whitespace-pre-wrap">{description}</pre>
                          </div>
                        )}
                        
                        {/* AÃ§Ãµes individuais */}
                        {alert.actionable !== false && (
                          <div className="mt-3 flex gap-2">
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismiss(id);
                              }}
                              className={classNames(
                                `px-2 py-1 rounded-md text-xs font-medium`,
                                'bg-bolt-elements-button-secondary-background',
                                'hover:bg-bolt-elements-button-secondary-backgroundHover',
                                'text-bolt-elements-button-secondary-text',
                              )}
                            >
                              Ignorar
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

        {/* Action buttons at the bottom */}
        <div className="flex justify-end gap-2 mt-4">
          {alerts.length > 0 && (
              <button
              onClick={() => {
                // Criar uma mensagem combinada com todos os erros
                const combinedMessage = `*Corrigir todos estes erros:* \n${alerts.map(alert => {
                  // Verificar se Ã© um erro de mÃ³dulo agrupado
                  if (alert.metadata && 'moduleErrorInfo' in alert.metadata) {
                    const moduleInfo = alert.metadata.moduleErrorInfo;
                    return `\n### MÃ³dulo nÃ£o encontrado: ${moduleInfo.moduleName}\nArquivos afetados: ${moduleInfo.filesAffected}\n\`\`\`js\n${moduleInfo.contextCode}\n\`\`\``;
                  }
                  return `\n### ${alert.title || (alert.source === 'preview' ? 'Preview Error' : 'Terminal Error')}\n\`\`\`${alert.source === 'preview' ? 'js' : 'sh'}\n${alert.content}\n\`\`\``;
                }).join('\n')}`;
                postMessage(combinedMessage);
                clearAlert(); // Limpar todos os alertas apÃ³s enviar
              }}
                className={classNames(
                `px-2 py-1 rounded-md text-sm font-medium`,
                  'bg-bolt-elements-button-primary-background',
                  'hover:bg-bolt-elements-button-primary-backgroundHover',
                  'text-bolt-elements-button-primary-text',
                  'flex items-center gap-1.5',
                )}
              >
                <div className="i-ph:chat-circle-duotone"></div>
              Corrigir Todos
            </button>
          )}
          <button
            onClick={() => clearAlert()}
            className={classNames(
              `px-2 py-1 rounded-md text-sm font-medium`,
              'bg-bolt-elements-button-secondary-background',
              'hover:bg-bolt-elements-button-secondary-backgroundHover',
              'text-bolt-elements-button-secondary-text',
            )}
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
