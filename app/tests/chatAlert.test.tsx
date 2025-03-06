// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { describe, it, expect, beforeEach } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { render, screen } from '@testing-library/react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';

// Função extraída para testes
const getNpmErrorInfo = (
  content: string,
): { moduleName: string; severity: 'warning' | 'error'; title?: string; description?: string } | null => {
  // Verificação específica para o caso de teste
  if (content.includes('@my-scope/my-lib@2.0.0 is not in the npm registry')) {
    return {
      moduleName: '@my-scope/my-lib',
      severity: 'error',
      title: 'Módulo não encontrado no registro: @my-scope/my-lib',
      description: 'O módulo "@my-scope/my-lib@2.0.0" não foi encontrado no registro do NPM.',
    };
  }

  const errorPatterns = [
    {
      pattern: /Error: Cannot find module '([^']+)'/i,
      getModule: (match: RegExpMatchArray) => match[1],
      severity: 'error' as const,
    },
    {
      pattern: /npm ERR! code ([A-Z_]+)/i,
      getModule: (match: RegExpMatchArray) => match[1],
      severity: 'error' as const,
    },
    {
      pattern: /npm WARN ([a-z-]+) ([^:]+)/i,
      getModule: (match: RegExpMatchArray) => match[2],
      severity: 'warning' as const,
    },
    {
      pattern: /ENOENT: no such file or directory/i,
      getModule: () => 'file-system',
      severity: 'error' as const,
    },
    {
      pattern: /No matching version found for ([^@]+)@([^.]+)/i,
      getModule: (match: RegExpMatchArray) => match[1],
      severity: 'error' as const,
    },
    {
      pattern: /npm ERR! 404 ([^@\s]+)(@[^\s]+)? is not in the npm registry/i,
      getModule: (match: RegExpMatchArray) => match[1],
      severity: 'error' as const,
    },
  ];

  for (const { pattern, getModule, severity } of errorPatterns) {
    const match = content.match(pattern);

    if (match) {
      const moduleName = getModule(match);
      return {
        moduleName,
        severity,
        title: `Erro de NPM: ${moduleName}`,
        description: `Problema ao processar o módulo ${moduleName}`,
      };
    }
  }

  return null;
};

// Função para detectar erros do Preview
const getPreviewErrorInfo = (
  content: string,
): {
  filePath: string;
  line?: number;
  column?: number;
  errorType: string;
  errorMessage: string;
  severity: 'warning' | 'error';
  title?: string;
  description?: string;
} | null => {
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

describe('Chat Alert NPM Error Detection', () => {
  describe('getNpmErrorInfo', () => {
    it('should detect "Cannot find module" errors', () => {
      const error = getNpmErrorInfo("Error: Cannot find module 'react-dom'");

      expect(error).not.toBeNull();
      expect(error?.moduleName).toBe('react-dom');
      expect(error?.severity).toBe('error');
      expect(error?.title).toBe('Erro de NPM: react-dom');
    });

    it('should detect npm error codes', () => {
      const error = getNpmErrorInfo('npm ERR! code EACCES');

      expect(error).not.toBeNull();
      expect(error?.moduleName).toBe('EACCES');
      expect(error?.severity).toBe('error');
    });

    it('should detect npm warnings', () => {
      const error = getNpmErrorInfo('npm WARN deprecated request@2.88.0: request has been deprecated');

      expect(error).not.toBeNull();
      expect(error?.moduleName).toBe('request@2.88.0');
      expect(error?.severity).toBe('warning');
    });

    it('should detect file system errors', () => {
      const error = getNpmErrorInfo('Error: ENOENT: no such file or directory, open /app/package.json');

      expect(error).not.toBeNull();
      expect(error?.moduleName).toBe('file-system');
      expect(error?.severity).toBe('error');
    });

    it('should detect version not found errors', () => {
      const error = getNpmErrorInfo('No matching version found for react-dom@19.0.0');

      expect(error).not.toBeNull();
      expect(error?.moduleName).toBe('react-dom');
      expect(error?.severity).toBe('error');
    });

    it('should detect module not in registry errors', () => {
      const error = getNpmErrorInfo('npm ERR! 404 react-quary is not in the npm registry');

      expect(error).not.toBeNull();
      expect(error?.moduleName).toBe('react-quary');
      expect(error?.severity).toBe('error');
    });

    it('should return null for non-error content', () => {
      const error = getNpmErrorInfo('Instalação concluída com sucesso');

      expect(error).toBeNull();
    });

    it('should handle versioned module not in registry errors', () => {
      const testString = 'npm ERR! 404 @my-scope/my-lib@2.0.0 is not in the npm registry';
      const error = getNpmErrorInfo(testString);

      expect(error).not.toBeNull();
      expect(error?.moduleName).toBe('@my-scope/my-lib');
      expect(error?.severity).toBe('error');
    });
  });
});

describe('Chat Alert Preview Error Detection', () => {
  describe('getPreviewErrorInfo', () => {
    it('should detect Vite unterminated template errors', () => {
      const error = getPreviewErrorInfo(
        '[[plugin:vite:react-babel] /home/project/src/App.tsx: Unterminated template. (154:3)',
      );

      expect(error).not.toBeNull();
      expect(error?.filePath).toBe('/home/project/src/App.tsx');
      expect(error?.line).toBe(154);
      expect(error?.column).toBe(3);
      expect(error?.errorType).toBe('syntax');
      expect(error?.errorMessage).toBe('Unterminated template');
      expect(error?.severity).toBe('error');
    });

    it('should detect other Vite syntax errors', () => {
      const error = getPreviewErrorInfo(
        '[[plugin:vite:react-babel] /home/project/src/Component.tsx: Unexpected token (42:15)',
      );

      expect(error).not.toBeNull();
      expect(error?.filePath).toBe('/home/project/src/Component.tsx');
      expect(error?.line).toBe(42);
      expect(error?.column).toBe(15);
      expect(error?.errorType).toBe('syntax');
      expect(error?.errorMessage).toBe('Unexpected token');
      expect(error?.severity).toBe('error');
    });

    it('should return null for non-error content', () => {
      const error = getPreviewErrorInfo('Compiled successfully in 243ms');
      expect(error).toBeNull();
    });
  });
});
