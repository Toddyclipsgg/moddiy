import { cleanStackTrace } from './stacktrace';

/**
 * Error Formatter Utility
 *
 * This utility provides functions to clean and format error messages
 * to make them more human-readable and actionable.
 */

// Common error patterns that we can transform into more readable messages
const ERROR_PATTERNS = [
  {
    regex: /Cannot find module '([^']+)'/i,
    format: (matches: RegExpMatchArray) => ({
      title: 'Module Not Found',
      description: `The module '${matches[1]}' could not be found.`,
      suggestion: `Make sure the package is installed. Try running 'npm install ${matches[1]}'`,
    }),
  },
  {
    regex: /ENOENT: no such file or directory, open '([^']+)'/i,
    format: (matches: RegExpMatchArray) => ({
      title: 'File Not Found',
      description: `The file '${matches[1]}' could not be found.`,
      suggestion: 'Check if the file exists and if the path is correct.',
    }),
  },
  {
    regex: /Syntax Error: (.*?) at line (\d+)/i,
    format: (matches: RegExpMatchArray) => ({
      title: 'Syntax Error',
      description: `${matches[1]} at line ${matches[2]}`,
      suggestion: 'Check your code syntax for errors like missing brackets, commas, or quotes.',
    }),
  },
  {
    regex: /EADDRINUSE: address already in use :?(\d+)?/i,
    format: (matches: RegExpMatchArray) => ({
      title: 'Port Already In Use',
      description: `The port ${matches[1] || 'specified'} is already in use.`,
      suggestion: 'Try shutting down other services that might be using this port or specify a different port.',
    }),
  },
  {
    regex: /TypeError: (.*?) is not a function/i,
    format: (matches: RegExpMatchArray) => ({
      title: 'Type Error',
      description: `${matches[1]} is not a function`,
      suggestion: 'Check that you are calling a function and not a property or undefined value.',
    }),
  },
];

/**
 * Extracts relevant information from an error message
 * @param errorMessage The original error message
 * @returns Formatted error object with title, description, and suggestion
 */
export function extractErrorInfo(errorMessage: string): {
  title: string;
  description: string;
  suggestion?: string;
} {
  // Clean up the stack trace
  const cleanedError = cleanStackTrace(errorMessage);

  // Try to match against known error patterns
  for (const pattern of ERROR_PATTERNS) {
    const match = cleanedError.match(pattern.regex);

    if (match) {
      return pattern.format(match);
    }
  }

  /*
   * Default formatting if no patterns match
   * Extract the first line for the description
   */
  const firstLine = cleanedError.split('\n')[0].trim();

  return {
    title: 'Error Detected',
    description: firstLine || cleanedError,
  };
}

/**
 * Truncates error message to a reasonable length
 * @param errorMessage The original error message
 * @param maxLength Maximum length before truncation
 * @returns Truncated error message
 */
export function truncateErrorMessage(errorMessage: string, maxLength: number = 500): string {
  if (!errorMessage || errorMessage.length <= maxLength) {
    return errorMessage;
  }

  return errorMessage.substring(0, maxLength) + '... (truncated)';
}

/**
 * Formats an error message for display in UI
 * @param errorMessage The original error message
 * @returns Formatted error object ready for display
 */
export function formatErrorForDisplay(errorMessage: string): {
  formattedTitle: string;
  formattedDescription: string;
  formattedContent: string;
  suggestion?: string;
} {
  const { title, description, suggestion } = extractErrorInfo(errorMessage);

  return {
    formattedTitle: title,
    formattedDescription: description,
    formattedContent: truncateErrorMessage(errorMessage),
    suggestion,
  };
}
