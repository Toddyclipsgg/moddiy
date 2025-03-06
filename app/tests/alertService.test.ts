import { describe, it, expect, beforeEach } from 'vitest';
import { alertService } from '~/lib/services/alertService';

describe('Alert Service', () => {
  // Reset alert state before each test
  beforeEach(() => {
    alertService.clearAlert();
  });

  it('should create an alert with required fields', () => {
    const alert = alertService.createAlert({
      type: 'test',
      title: 'Test Alert',
      description: 'This is a test alert',
      content: 'Test content',
      severity: 'info',
    });

    // Check that required fields are present
    expect(alert.id).toBeDefined();
    expect(alert.timestamp).toBeDefined();
    expect(alert.type).toBe('test');
    expect(alert.title).toBe('Test Alert');
    expect(alert.description).toBe('This is a test alert');
    expect(alert.content).toBe('Test content');
    expect(alert.severity).toBe('info');

    // Check that the alert is in the active alerts list
    const activeAlerts = alertService.activeAlerts.get();
    expect(activeAlerts).toContainEqual(alert);

    // Check backward compatibility with currentAlert
    const currentAlert = alertService.currentAlert.get();
    expect(currentAlert).toEqual(alert);
  });

  it('should create terminal error alert with proper defaults', () => {
    const alert = alertService.createTerminalErrorAlert('Command failed', 'Error: command not found');

    expect(alert.type).toBe('error');
    expect(alert.title).toBe('Terminal Error');
    expect(alert.description).toBe('Command failed');
    expect(alert.content).toBe('Error: command not found');
    expect(alert.source).toBe('terminal');
    expect(alert.severity).toBe('error');
    expect(alert.suggestedAction).toBeDefined();
  });

  it('should create preview error alert with proper defaults', () => {
    const alert = alertService.createPreviewErrorAlert('Failed to load', 'Error: module not found');

    expect(alert.type).toBe('error');
    expect(alert.title).toBe('Preview Error');
    expect(alert.description).toBe('Failed to load');
    expect(alert.content).toBe('Error: module not found');
    expect(alert.source).toBe('preview');
    expect(alert.severity).toBe('error');
    expect(alert.suggestedAction).toBeDefined();
  });

  it('should clear all alerts', () => {
    // Create multiple alerts
    alertService.createAlert({
      type: 'test1',
      title: 'Test Alert 1',
      description: 'This is a test alert',
      content: 'Test content',
      severity: 'info',
    });

    alertService.createAlert({
      type: 'test2',
      title: 'Test Alert 2',
      description: 'This is another test alert',
      content: 'Test content 2',
      severity: 'warning',
    });

    // Verify they're set
    expect(alertService.activeAlerts.get().length).toBe(2);
    expect(alertService.currentAlert.get()).toBeDefined();

    // Clear all
    alertService.clearAlert();

    // Verify all are cleared
    expect(alertService.activeAlerts.get().length).toBe(0);
    expect(alertService.currentAlert.get()).toBeUndefined();
  });

  it('should clear a specific alert by ID', () => {
    // Create multiple alerts
    const alert1 = alertService.createAlert({
      type: 'test1',
      title: 'Test Alert 1',
      description: 'This is a test alert',
      content: 'Test content',
      severity: 'info',
    });

    const alert2 = alertService.createAlert({
      type: 'test2',
      title: 'Test Alert 2',
      description: 'This is another test alert',
      content: 'Test content 2',
      severity: 'warning',
    });

    // Verify they're set
    expect(alertService.activeAlerts.get().length).toBe(2);

    // Clear only the first alert
    alertService.clearAlert(alert1.id);

    // Verify only the first one is cleared
    const remainingAlerts = alertService.activeAlerts.get();
    expect(remainingAlerts.length).toBe(1);
    expect(remainingAlerts[0].id).toBe(alert2.id);
  });

  it('should maintain alert history', () => {
    // Create several alerts
    const alert1 = alertService.createAlert({
      type: 'test1',
      title: 'Test Alert 1',
      description: 'First test alert',
      content: 'Test content 1',
      severity: 'info',
    });

    const alert2 = alertService.createAlert({
      type: 'test2',
      title: 'Test Alert 2',
      description: 'Second test alert',
      content: 'Test content 2',
      severity: 'warning',
    });

    // Get history
    const history = alertService.getAlertHistory();

    // Newest alerts should be first in the array
    expect(history[0]).toEqual(alert2);
    expect(history[1]).toEqual(alert1);
  });

  it('should create system alerts', () => {
    const alert = alertService.createSystemAlert('System Notification', 'Something happened in the system', 'info');

    expect(alert.type).toBe('system');
    expect(alert.title).toBe('System Notification');
    expect(alert.description).toBe('Something happened in the system');
    expect(alert.source).toBe('system');
    expect(alert.severity).toBe('info');
    expect(alert.actionable).toBe(false);
  });

  it('should limit the number of active alerts when exceeding maximum', () => {
    // Create more alerts than the max limit
    const maxAlerts = 20; // Valor real usado no AlertService
    const totalToCreate = maxAlerts + 5;

    for (let i = 0; i < totalToCreate; i++) {
      alertService.createAlert({
        type: `test${i}`,
        title: `Test Alert ${i}`,
        description: `Test alert ${i}`,
        content: `Test content ${i}`,
        severity: 'info',
      });
    }

    // Verificar que apenas o número máximo de alertas está ativo
    const activeAlerts = alertService.activeAlerts.get();
    expect(activeAlerts.length).toBe(maxAlerts);
  });

  it('should prioritize critical alerts when at capacity', () => {
    const maxAlerts = 20; // Valor real usado no AlertService

    // Criar alertas críticos preenchendo a capacidade máxima
    for (let i = 0; i < maxAlerts; i++) {
      alertService.createAlert({
        type: `test${i}`,
        title: `Critical Alert ${i}`,
        description: `Critical alert ${i}`,
        content: `Test content ${i}`,
        severity: 'critical',
      });
    }

    // Tentar adicionar um alerta não crítico
    const nonCriticalAlert = alertService.createAlert({
      type: 'test',
      title: 'Non-critical Alert',
      description: 'This should not be added',
      content: 'Test content',
      severity: 'info',
    });

    // Verificar que apenas alertas críticos estão ativos
    const activeAlerts = alertService.activeAlerts.get();
    expect(activeAlerts.length).toBe(maxAlerts);
    expect(activeAlerts.every((alert) => alert.severity === 'critical')).toBe(true);
    expect(activeAlerts.some((alert) => alert.id === nonCriticalAlert.id)).toBe(false);
  });
});
