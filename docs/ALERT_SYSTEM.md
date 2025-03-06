# Alert System Documentation

## Overview

The Alert System provides a standardized, centralized approach to handling and displaying application alerts to users. This document outlines the architecture, components, and usage of the new alert system.

## Key Components

### 1. ActionAlert Interface

Enhanced interface with more metadata and contextual information:

```typescript
export interface ActionAlert {
  id: string;                 // Unique identifier
  type: string;               // Alert type
  title: string;              // Alert title
  description: string;        // Detailed description
  content: string;            // Original error content
  source?: 'terminal' | 'preview' | 'system'; // Source of alert
  severity: 'info' | 'warning' | 'error' | 'critical'; // Alert level
  timestamp: number;          // Creation timestamp
  metadata?: Record<string, any>; // Additional debugging data
  actionable?: boolean;       // If user can take action
  suggestedAction?: string;   // Suggested action text
}
```

### 2. Alert Service

A singleton service (`alertService`) that manages alerts:

- **Creation**: `createAlert()`, `createTerminalErrorAlert()`, `createPreviewErrorAlert()`, `createSystemAlert()`
- **Management**: `clearAlert()`
- **Access**: `currentAlert` getter, `getAlertHistory()`

### 3. Error Formatter Utility

Utilities for making error messages more user-friendly:

- **Pattern Matching**: Recognizes common error patterns and translates them
- **Formatting**: `formatErrorForDisplay()`, `extractErrorInfo()`, `truncateErrorMessage()`

### 4. ChatAlert Component

Redesigned component that:
- Shows different visual styles based on severity
- Supports auto-dismissal for info alerts
- Shows timestamps
- Provides relevant action buttons
- Better formats error details

## Usage Examples

### Creating Alerts

```typescript
// Create a generic alert
alertService.createAlert({
  type: 'custom',
  title: 'Custom Alert',
  description: 'Something happened',
  content: 'Detailed information',
  severity: 'warning'
});

// Create a terminal error alert
alertService.createTerminalErrorAlert(
  'Command failed', 
  'Error details from terminal'
);

// Create a preview error alert
alertService.createPreviewErrorAlert(
  'Preview failed to load', 
  'Error details from preview'
);

// Create an informational system alert
alertService.createSystemAlert(
  'Operation Complete',
  'Your files have been processed successfully',
  'info'
);
```

### Accessing and Clearing Alerts

```typescript
// Get the current alert
const currentAlert = alertService.currentAlert.get();

// Clear the current alert
alertService.clearAlert();

// Get alert history
const alertHistory = alertService.getAlertHistory();
```

### Working with Error Formatting

```typescript
import { formatErrorForDisplay } from '~/utils/error-formatter';

// Format an error message
const formattedError = formatErrorForDisplay(errorMessage);

// Access formatted parts
const {
  formattedTitle,
  formattedDescription,
  formattedContent,
  suggestion
} = formattedError;
```

## Benefits of the New System

1. **Centralized Management**: Single source of truth for alerts
2. **Better Context**: More metadata for debugging and tracking
3. **Improved UX**: Visually distinctive alerts based on severity
4. **Error Intelligence**: Pattern matching to provide better error descriptions
5. **History Tracking**: Keep track of past alerts for auditing
6. **Customization**: Flexible API allowing various alert types
7. **Consistent Behavior**: Standardized approach to alert creation and display

## Implementation Details

The alert system was implemented by:

1. Enhancing the `ActionAlert` interface with additional fields
2. Creating a centralized `alertService` singleton
3. Updating the `ActionRunner` to use the service
4. Improving error message formatting with pattern recognition
5. Redesigning the `ChatAlert` component for better UX
6. Updating all alert creation points to use the new service
7. Adding comprehensive unit tests

## Future Improvements

Potential future enhancements to consider:

1. Categorization system for grouping related alerts
2. Multi-alert display capability for concurrent issues
3. Persistent alert storage for session recovery
4. Alert analytics for tracking common issues
5. Extension points for custom alert handlers 