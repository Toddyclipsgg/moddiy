export interface DeviceInfo {
  fingerprint: string;
  platform: string;
  browser: string;
  os: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
  touchSupport: boolean;
  canvas?: string;
  webgl?: string;
}

export interface SecurityMetrics {
  deviceId: string;
  lastLogin: string;
  loginCount: number;
  failedAttempts: number;
  riskScore: number;
  accountsPerDevice: number;
  blockedUntil?: string;
}

export interface SecurityRules {
  maxAccountsPerDevice: number;
  maxLoginAttempts: number;
  blockDuration: number; // minutos
  riskThreshold: number; // 0-1
  cooldownPeriod: number; // minutos
} 