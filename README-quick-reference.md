# File Processing - Quick Guide

## Supported File Types

| Type | Extensions | Maximum Size | Features |
|------|-----------|----------------|----------|
| PDF | .pdf | 100MB | Text extraction, thumbnails, page count |
| Word | .docx | 100MB | Text extraction |
| Images | .jpg, .png, etc. | 100MB | Preview |
| Text | .txt | 100MB | Content display |
| Markdown | .md | 100MB | Markdown rendering |

## How to Use

1. **File Upload**: 
   - Click the upload button in the chat interface, or
   - Drag and drop files, or
   - Paste content directly (Ctrl+V/Cmd+V)

2. **Processing**:
   - PDF and DOCX files will have text automatically extracted
   - Images will be displayed as thumbnails
   - Text and markdown files will be processed for visualization

3. **Limitations**:
   - Scanned PDFs without OCR will not have extractable text
   - DOCX documents with complex formatting may lose some structure

## PDF Processing

PDF text extraction uses `pdfjs-dist` with:
- Caching for reuse
- Batch processing for large PDFs
- Fallback method for problematic PDFs

## Internal API

```typescript
// For developers using these features in code:
import { extractTextFromDocument } from '~/utils/documentUtils';

// Extract text from any supported document
const text = await extractTextFromDocument(file);
```

For detailed documentation, see [README-document-processing.md](./README-document-processing.md) 