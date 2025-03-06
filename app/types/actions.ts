import type { Change } from 'diff';

export type ActionType = 'file' | 'shell';

export interface BaseAction {
  content: string;
}

export interface FileAction extends BaseAction {
  type: 'file';
  filePath: string;
}

export interface ShellAction extends BaseAction {
  type: 'shell';
}

export interface StartAction extends BaseAction {
  type: 'start';
}

export interface BuildAction extends BaseAction {
  type: 'build';
}

export type BoltAction = FileAction | ShellAction | StartAction | BuildAction;

export type BoltActionData = BoltAction | BaseAction;

export interface ActionAlert {
  id: string; // Unique identifier for tracking alerts
  type: string;
  title: string;
  description: string;
  content: string;
  source?: 'terminal' | 'preview' | 'system'; // Added 'system' for general errors
  severity: 'info' | 'warning' | 'error' | 'critical'; // Alert severity level
  timestamp: number; // When the alert was created
  metadata?: Record<string, any>; // Optional additional data for debugging
  actionable?: boolean; // Whether user can take action on this alert
  suggestedAction?: string; // Optional suggested action in natural language
}

export interface FileHistory {
  originalContent: string;
  lastModified: number;
  changes: Change[];
  versions: {
    timestamp: number;
    content: string;
  }[];

  // Novo campo para rastrear a origem das mudanças
  changeSource?: 'user' | 'auto-save' | 'external';
}
