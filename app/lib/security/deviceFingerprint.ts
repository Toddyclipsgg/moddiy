import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { supabase } from '~/lib/supabase';
import type { DeviceInfo, SecurityMetrics, SecurityRules } from '~/types/security';

// Configurações de segurança padrão
const DEFAULT_SECURITY_RULES: SecurityRules = {
  maxAccountsPerDevice: 1,
  maxLoginAttempts: 3,
  blockDuration: 60, // 60 minutos
  riskThreshold: 0.5, // 50% de risco máximo permitido
  cooldownPeriod: 120, // 120 minutos entre criações de conta
};

// Inicializa o FingerprintJS
const fpPromise = FingerprintJS.load();

// Função para gerar a impressão digital do dispositivo
export async function getDeviceFingerprint(): Promise<DeviceInfo> {
  const fp = await fpPromise;
  const result = await fp.get();

  const deviceInfo: DeviceInfo = {
    fingerprint: result.visitorId,
    platform: navigator.platform,
    browser: navigator.userAgent.split(' ').pop() || '',
    os: navigator.platform,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    userAgent: navigator.userAgent,
    touchSupport: 'ontouchstart' in window,
  };

  // Adiciona canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 200;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125,1,62,20);
      ctx.fillStyle = '#069';
      ctx.fillText('bolt.diy', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('bolt.diy', 4, 17);
      deviceInfo.canvas = canvas.toDataURL();
    }
  } catch (e) {
    console.warn('Canvas fingerprinting failed:', e);
  }

  // Adiciona WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      deviceInfo.webgl = [
        gl.getParameter(gl.VENDOR),
        gl.getParameter(gl.RENDERER),
        gl.getParameter(gl.VERSION)
      ].join('::');
    }
  } catch (e) {
    console.warn('WebGL fingerprinting failed:', e);
  }

  return deviceInfo;
}

// Função para verificar e atualizar métricas de segurança
export async function checkSecurityMetrics(deviceInfo: DeviceInfo): Promise<SecurityMetrics> {
  const { data: metrics, error } = await supabase
    .from('security_metrics')
    .select('*')
    .eq('deviceId', deviceInfo.fingerprint)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = Not Found
    throw error;
  }

  const now = new Date().toISOString();
  const newMetrics: SecurityMetrics = metrics || {
    deviceId: deviceInfo.fingerprint,
    lastLogin: now,
    loginCount: 0,
    failedAttempts: 0,
    riskScore: 0,
    accountsPerDevice: 0,
  };

  return newMetrics;
}

// Função para calcular pontuação de risco
export function calculateRiskScore(deviceInfo: DeviceInfo, metrics: SecurityMetrics): number {
  let riskScore = 0;

  // Fatores de risco e seus pesos (ajustados para serem mais rigorosos)
  const riskFactors = {
    multipleAccounts: 0.4,
    failedAttempts: 0.3,
    rapidLogins: 0.3,
    unusualBehavior: 0.4,
  };

  // Avalia múltiplas contas
  if (metrics.accountsPerDevice > DEFAULT_SECURITY_RULES.maxAccountsPerDevice) {
    riskScore += riskFactors.multipleAccounts;
  }

  // Avalia tentativas falhas
  if (metrics.failedAttempts > DEFAULT_SECURITY_RULES.maxLoginAttempts) {
    riskScore += riskFactors.failedAttempts;
  }

  // Avalia logins rápidos
  const lastLoginDate = new Date(metrics.lastLogin);
  const now = new Date();
  const timeSinceLastLogin = (now.getTime() - lastLoginDate.getTime()) / 1000 / 60; // em minutos
  if (timeSinceLastLogin < DEFAULT_SECURITY_RULES.cooldownPeriod) {
    riskScore += riskFactors.rapidLogins;
  }

  // Avalia comportamento incomum
  const unusualBehavior = checkUnusualBehavior(deviceInfo);
  if (unusualBehavior) {
    riskScore += riskFactors.unusualBehavior;
  }

  return Math.min(1, riskScore);
}

// Função para verificar comportamento incomum
function checkUnusualBehavior(deviceInfo: DeviceInfo): boolean {
  // Verifica se o user agent parece ser de um bot
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /headless/i,
    /selenium/i, /puppeteer/i, /phantom/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(deviceInfo.userAgent))) {
    return true;
  }

  // Verifica se a resolução é muito pequena ou incomum
  const [width, height] = deviceInfo.screenResolution.split('x').map(Number);
  if (width < 320 || height < 240) {
    return true;
  }

  // Verifica se o hardware concurrency é suspeito
  if (deviceInfo.hardwareConcurrency !== undefined && 
      (deviceInfo.hardwareConcurrency === 1 || deviceInfo.hardwareConcurrency > 32)) {
    return true;
  }

  return false;
}

// Função para atualizar métricas de segurança
export async function updateSecurityMetrics(
  deviceInfo: DeviceInfo,
  metrics: SecurityMetrics,
  success: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const updates = {
    ...metrics,
    lastLogin: now,
    loginCount: metrics.loginCount + (success ? 1 : 0),
    failedAttempts: success ? 0 : metrics.failedAttempts + 1,
    riskScore: calculateRiskScore(deviceInfo, metrics),
  };

  if (updates.failedAttempts >= DEFAULT_SECURITY_RULES.maxLoginAttempts) {
    const blockUntil = new Date();
    blockUntil.setMinutes(blockUntil.getMinutes() + DEFAULT_SECURITY_RULES.blockDuration);
    updates.blockedUntil = blockUntil.toISOString();
  }

  const { error } = await supabase
    .from('security_metrics')
    .upsert(updates);

  if (error) {
    throw error;
  }
}

// Função para verificar se o dispositivo está bloqueado
export function isDeviceBlocked(metrics: SecurityMetrics): boolean {
  if (!metrics.blockedUntil) {
    return false;
  }

  const now = new Date();
  const blockedUntil = new Date(metrics.blockedUntil);
  return now < blockedUntil;
}

// Função para verificar se é permitido criar nova conta
export async function canCreateNewAccount(deviceInfo: DeviceInfo): Promise<boolean> {
  const metrics = await checkSecurityMetrics(deviceInfo);
  
  // Verifica se já atingiu o limite de contas
  if (metrics.accountsPerDevice >= DEFAULT_SECURITY_RULES.maxAccountsPerDevice) {
    return false;
  }

  // Verifica se está no período de cooldown
  const lastLoginDate = new Date(metrics.lastLogin);
  const now = new Date();
  const timeSinceLastLogin = (now.getTime() - lastLoginDate.getTime()) / 1000 / 60; // em minutos
  if (timeSinceLastLogin < DEFAULT_SECURITY_RULES.cooldownPeriod) {
    return false;
  }

  // Verifica score de risco
  const riskScore = calculateRiskScore(deviceInfo, metrics);
  if (riskScore > DEFAULT_SECURITY_RULES.riskThreshold) {
    return false;
  }

  return true;
} 