/**
 * Cleans webcontainer URLs from stack traces to show relative paths instead
 */
export function cleanStackTrace(stackTrace: string): string {
  if (!stackTrace) {
    return '';
  }

  const cleanUrl = (url: string): string => {
    return url.replace(/webpack:\/\/\/?/, '').replace(/webpack:\/?/, '');
  };

  // Dividir por linhas e filtrar linhas vazias
  const lines = stackTrace.split('\n').filter((line) => line.trim().length > 0);

  // Processar cada linha para torná-la mais legível
  const processedLines = lines.map((line) => {
    // Remover informações desnecessárias de webpack
    line = line.replace(/at (.*) \(webpack:(\/\/)?/, 'at $1 (');

    // Limpar URLs
    const urlMatch = line.match(/\(([^)]+)\)/);

    if (urlMatch) {
      const cleanedUrl = cleanUrl(urlMatch[1]);
      line = line.replace(urlMatch[1], cleanedUrl);
    }

    // Destacar linhas de código fonte
    if (line.includes('.tsx:') || line.includes('.ts:') || line.includes('.js:')) {
      return `→ ${line}`;
    }

    return line;
  });

  return processedLines.join('\n');
}

/**
 * Extrai informações úteis de um stack trace
 * @param stackTrace O stack trace a ser analisado
 * @returns Objeto com informações extraídas
 */
export function extractStackTraceInfo(stackTrace: string): {
  firstSourceFile?: string;
  firstSourceLine?: number;
  firstSourceColumn?: number;
  errorName?: string;
  errorMessage?: string;
  relevantFrames: Array<{ file: string; line?: number; column?: number; function?: string }>;
} {
  if (!stackTrace) {
    return { relevantFrames: [] };
  }

  const lines = stackTrace.split('\n');
  const relevantFrames: Array<{ file: string; line?: number; column?: number; function?: string }> = [];

  let errorName: string | undefined;
  let errorMessage: string | undefined;
  let firstSourceFile: string | undefined;
  let firstSourceLine: number | undefined;
  let firstSourceColumn: number | undefined;

  // Verificar se a primeira linha contém o nome do erro
  const errorMatch = lines[0]?.match(/^(?:Error: )?([\w\d_]+Error|[\w\d_]+Exception)(?:: (.+))?$/);

  if (errorMatch) {
    errorName = errorMatch[1];
    errorMessage = errorMatch[2];
  }

  // Processar frames do stack trace
  for (let i = errorName ? 1 : 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Ignorar linhas vazias
    if (!line) {
      continue;
    }

    // Padrão para stack frames: "at Function.Module._resolveFilename (node:internal/modules/cjs/loader:933:15)"
    const frameMatch = line.match(/at (?:([^(]+) \()?([^:]+):(\d+)(?::(\d+))?\)?/);

    if (frameMatch) {
      const funcName = frameMatch[1]?.trim();
      const file = frameMatch[2];
      const lineNum = frameMatch[3] ? parseInt(frameMatch[3], 10) : undefined;
      const colNum = frameMatch[4] ? parseInt(frameMatch[4], 10) : undefined;

      // Ignorar frames internos de Node.js e bibliotecas
      if (file && !file.startsWith('node:') && !file.includes('node_modules')) {
        relevantFrames.push({
          file,
          line: lineNum,
          column: colNum,
          function: funcName,
        });

        if (firstSourceFile === undefined) {
          firstSourceFile = file;
          firstSourceLine = lineNum;
          firstSourceColumn = colNum;
        }
      }
    }
  }

  return {
    firstSourceFile,
    firstSourceLine,
    firstSourceColumn,
    errorName,
    errorMessage,
    relevantFrames,
  };
}

/**
 * Formata um stack trace para exibição na UI
 * @param stackTrace O stack trace a ser formatado
 * @returns HTML formatado para o stack trace
 */
export function formatStackTraceForDisplay(stackTrace: string): string {
  if (!stackTrace) {
    return '';
  }

  const cleanedTrace = cleanStackTrace(stackTrace);
  const traceInfo = extractStackTraceInfo(cleanedTrace);

  let formatted = '';

  // Adicionar cabeçalho com informações do erro
  if (traceInfo.errorName || traceInfo.errorMessage) {
    formatted += `<div class="error-header">${traceInfo.errorName || 'Error'}`;

    if (traceInfo.errorMessage) {
      formatted += `: <span class="error-message">${traceInfo.errorMessage}</span>`;
    }

    formatted += '</div>\n';
  }

  // Adicionar frames relevantes
  if (traceInfo.relevantFrames.length > 0) {
    formatted += '<div class="stack-frames">\n';

    for (const frame of traceInfo.relevantFrames) {
      formatted += `  <div class="stack-frame">`;
      formatted += `<span class="file">${frame.file}</span>`;

      if (frame.line) {
        formatted += `:<span class="line">${frame.line}</span>`;

        if (frame.column) {
          formatted += `:<span class="column">${frame.column}</span>`;
        }
      }

      if (frame.function) {
        formatted += ` <span class="function">${frame.function}</span>`;
      }

      formatted += '</div>\n';
    }

    formatted += '</div>';
  } else {
    // Se não encontrou frames relevantes, mostrar o stack trace limpo
    formatted += `<div class="raw-stack">${cleanedTrace}</div>`;
  }

  return formatted;
}
