import { atom, type WritableAtom } from 'nanostores';
import { v4 as uuidv4 } from 'uuid';
import type { ActionAlert } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { processModuleErrors } from '~/utils/shell';
import type { ModuleNotFoundError } from '~/utils/shell';

const logger = createScopedLogger('AlertService');

/**
 * Alert Service - Centralized management for application alerts
 *
 * This service provides methods to create, track, and manage alerts throughout the application.
 * It maintains a history of recent alerts and provides subscribers with updates when alerts change.
 */
class AlertService {
  // List of active alerts (changed from single alert to list)
  private _activeAlerts: WritableAtom<ActionAlert[]> = atom<ActionAlert[]>([]);

  // Alert history for tracking and auditing
  private _alertHistory: ActionAlert[] = [];
  private _maxHistorySize: number = 50;

  // Maximum number of alerts to show at once
  private _maxActiveAlerts: number = 20;

  // Cache for recent module errors
  private _recentModuleErrors = new Map<string, number>();

  /**
   * Create and display a new alert
   * @param alertData Partial alert data - missing fields will be auto-populated
   * @returns The created alert object
   */
  createAlert(alertData: Omit<ActionAlert, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): ActionAlert {
    const alert: ActionAlert = {
      ...alertData,
      id: alertData.id || uuidv4(),
      timestamp: alertData.timestamp || Date.now(),
      severity: alertData.severity || 'error',
      actionable: alertData.actionable ?? true,
    };

    logger.info(`Created alert: ${alert.id} - ${alert.title}`);

    // Add to active alerts
    const currentAlerts = this._activeAlerts.get();

    // If we already have max alerts, remove the oldest one (unless it's critical)
    if (currentAlerts.length >= this._maxActiveAlerts) {
      // Find first non-critical alert to remove (if any)
      const indexToRemove = currentAlerts.findIndex((a) => a.severity !== 'critical');

      if (indexToRemove >= 0) {
        currentAlerts.splice(indexToRemove, 1);
      } else if (alert.severity !== 'critical') {
        // If all existing alerts are critical and new one isn't, don't add it
        logger.info(`Not adding alert ${alert.id} - all slots are taken by critical alerts`);
        this._addToHistory(alert);

        return alert;
      } else {
        // If all are critical and new one is too, remove oldest
        currentAlerts.shift();
      }
    }

    this._activeAlerts.set([...currentAlerts, alert]);
    this._addToHistory(alert);

    return alert;
  }

  /**
   * Clear a specific alert by ID or all alerts if no ID provided
   * @param alertId Optional alert ID to clear
   */
  clearAlert(alertId?: string): void {
    if (alertId) {
      logger.info(`Clearing alert: ${alertId}`);

      const currentAlerts = this._activeAlerts.get();
      this._activeAlerts.set(currentAlerts.filter((alert) => alert.id !== alertId));
    } else {
      logger.info('Clearing all alerts');
      this._activeAlerts.set([]);
    }
  }

  /**
   * Get active alerts atom for subscription
   */
  get activeAlerts() {
    return this._activeAlerts;
  }

  /**
   * Get the current active alert (for backward compatibility)
   */
  get currentAlert() {
    // For backward compatibility, we return an atom that contains the latest alert
    return {
      get: () => {
        const alerts = this._activeAlerts.get();
        return alerts.length > 0 ? alerts[alerts.length - 1] : undefined;
      },
      subscribe: (callback: (value: ActionAlert | undefined) => void) => {
        return this._activeAlerts.subscribe((alerts) => {
          callback(alerts.length > 0 ? alerts[alerts.length - 1] : undefined);
        });
      },
    } as WritableAtom<ActionAlert | undefined>;
  }

  /**
   * Get the alert history
   */
  getAlertHistory(): readonly ActionAlert[] {
    return [...this._alertHistory];
  }

  /**
   * Create a terminal error alert
   * @param description Error description
   * @param content Error content/details
   * @returns The created alert
   */
  createTerminalErrorAlert(description: string, content: string): ActionAlert {
    return this.createAlert({
      type: 'error',
      title: 'Terminal Error',
      description,
      content,
      source: 'terminal',
      severity: 'error',
      suggestedAction: 'Would you like Bolt to analyze and help resolve this issue?',
    });
  }

  /**
   * Create a preview error alert
   * @param description Error description
   * @param content Error content/details
   * @returns The created alert
   */
  createPreviewErrorAlert(description: string, content: string): ActionAlert {
    return this.createAlert({
      type: 'error',
      title: 'Preview Error',
      description,
      content,
      source: 'preview',
      severity: 'error',
      suggestedAction: 'Would you like Bolt to analyze and help resolve this issue?',
    });
  }

  /**
   * Create a system alert (for general notifications)
   * @param title Alert title
   * @param description Alert description
   * @param severity Alert severity
   * @returns The created alert
   */
  createSystemAlert(title: string, description: string, severity: ActionAlert['severity'] = 'info'): ActionAlert {
    return this.createAlert({
      type: 'system',
      title,
      description,
      content: '',
      source: 'system',
      severity,
      actionable: false,
    });
  }

  /**
   * Add an alert to the history
   * @param alert Alert to add to history
   */
  private _addToHistory(alert: ActionAlert): void {
    this._alertHistory.unshift(alert);

    // Trim history if it exceeds max size
    if (this._alertHistory.length > this._maxHistorySize) {
      this._alertHistory = this._alertHistory.slice(0, this._maxHistorySize);
    }
  }

  /**
   * Creates alerts for module errors detected in command output - optimized for performance
   * @param output Command output containing potential module errors
   * @returns Array of created alerts or null if no module errors found
   */
  createModuleErrorAlerts(output: string): ActionAlert[] | null {
    // Quick check to avoid unnecessary processing
    if (!output || !output.includes("Module not found: Can't resolve")) {
      return null;
    }

    // Error cache to avoid creating duplicate alerts in a short period
    const outputSignature = output.substring(0, 150);
    const now = Date.now();

    // Check if this same error was processed recently (last 2 seconds)
    if (this._recentModuleErrors.has(outputSignature)) {
      const lastTime = this._recentModuleErrors.get(outputSignature);

      if (now - lastTime! < 2000) {
        return null; // Skip duplicate processing
      }
    }

    // Register this error in the cache
    this._recentModuleErrors.set(outputSignature, now);

    // Periodically clean the cache (keep only the last 50 errors)
    if (this._recentModuleErrors.size > 100) {
      const entries = Array.from(this._recentModuleErrors.entries());
      const recent = entries.sort((a, b) => b[1] - a[1]).slice(0, 50);
      this._recentModuleErrors = new Map(recent);
    }

    // Process errors normally
    const moduleErrorsInfo = processModuleErrors(output);

    if (!moduleErrorsInfo || moduleErrorsInfo.alertGroups.length === 0) {
      return null;
    }

    const alerts: ActionAlert[] = [];

    // Map to track module errors for duplicate filtering
    const currentActiveErrorMap = new Map<string, boolean>();

    // Get currently active alerts for duplicate checking
    const activeAlerts = this._activeAlerts.get();

    // Build map of active module error alerts
    activeAlerts.forEach((alert) => {
      if (alert.type === 'module-error' && alert.metadata?.moduleErrorInfo?.moduleName) {
        currentActiveErrorMap.set(alert.metadata.moduleErrorInfo.moduleName, true);
      }
    });

    // Create alerts for each module error group - filtering duplicates
    for (const errorGroup of moduleErrorsInfo.alertGroups) {
      // Skip if we already have an active alert for this module
      if (currentActiveErrorMap.has(errorGroup.moduleName)) {
        logger.info(`Skipping duplicate module error alert for: ${errorGroup.moduleName}`);
        continue;
      }

      // Get additional context information
      const primaryError = errorGroup.primaryError;
      const additionalContext = {
        importType:
          errorGroup.type === 'module' ? (primaryError as ModuleNotFoundError).importType || 'static' : 'static',
        environment:
          errorGroup.type === 'module'
            ? (primaryError as ModuleNotFoundError).errorContext?.environment || 'unknown'
            : 'unknown',
        relatedPackages:
          errorGroup.type === 'module' ? (primaryError as ModuleNotFoundError).relatedPackages || [] : [],
        errorTime:
          errorGroup.type === 'module'
            ? (primaryError as ModuleNotFoundError).errorContext?.errorTime || Date.now()
            : Date.now(),
        stackTrace:
          errorGroup.type === 'module' ? (primaryError as ModuleNotFoundError).errorContext?.stackTrace || [] : [],
      };

      // Create enhanced metadata with more diagnostic information
      const enhancedMetadata = {
        moduleErrorInfo: {
          moduleName: errorGroup.moduleName,
          errorCount: errorGroup.errorCount,
          filesAffected: errorGroup.filesAffected,
          contextCode: errorGroup.content,
          docsUrl: errorGroup.type === 'module' ? (primaryError as ModuleNotFoundError).docsUrl : undefined,
          suggestedFixes: errorGroup.suggestedFixes,

          // Add enhanced diagnostic data
          importType: additionalContext.importType,
          environment: additionalContext.environment,
          relatedPackages: additionalContext.relatedPackages,
          errorTime: additionalContext.errorTime,
          stackTrace: additionalContext.stackTrace.slice(0, 5), // Limit stack trace length
        },
      };

      // Create alert with enhanced metadata
      const alert = this.createAlert({
        title: errorGroup.title,
        description: errorGroup.description,
        content: errorGroup.content,
        severity: 'error',
        source: 'preview',
        actionable: true,
        type: 'module-error',
        metadata: enhancedMetadata,
      });

      alerts.push(alert);
    }

    return alerts;
  }
}

// Export a singleton instance
export const alertService = new AlertService();
