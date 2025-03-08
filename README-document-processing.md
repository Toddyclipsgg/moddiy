# Document Processing

This document details the functionality for processing and displaying various types of files in the system, including PDF, DOCX, images, TXT, and MD.

## Table of Contents

- [Overview](#overview)
- [Supported Files](#supported-files)
- [Technical Implementation](#technical-implementation)
  - [PDF Processing](#pdf-processing)
  - [DOCX Processing](#docx-processing)
  - [Image Processing](#image-processing) 
  - [Text Processing](#text-processing)
  - [Markdown Processing](#markdown-processing)
- [User Interface](#user-interface)
- [Known Limitations](#known-limitations)
- [Possible Future Improvements](#possible-future-improvements)

## Overview

The system allows uploading, processing, and displaying various types of documents directly in the chat interface. This includes:

- Text extraction from PDF files
- Text extraction from DOCX documents
- Viewing and attaching images
- Viewing text files (.txt)
- Rendering markdown files (.md)

These features enrich the user experience by allowing the sharing of different types of content in the chat, with automatic text extraction and preview when applicable.

## Supported Files

| File Type | Extensions | Features |
|-----------------|-----------|-----------------|
| PDF | .pdf | Text extraction, thumbnail preview, page count |
| Word Documents | .docx | Text extraction |
| Images | .jpg, .jpeg, .png, .gif, .webp, .svg | Visualization, upload for context |
| Text | .txt | Visualization, upload for context |
| Markdown | .md | Rendered visualization, upload for context |

## Technical Implementation

### PDF Processing

Text extraction from PDF files is implemented using Mozilla's `pdfjs-dist` library. The system uses a layered approach:

1. **Main Method**: Uses PDF.js with optimizations
   - Document caching for reuse
   - Batch processing for large PDFs
   - Maintaining basic layout information

2. **Fallback Method**: Simplified implementation as a contingency
   - Analyzes PDF bytes to extract strings
   - Less accurate but more robust for problematic PDFs

Specific features for PDFs:
- First page thumbnail generation
- Total page count display
- Asynchronous processing with visual feedback
- Support for large PDFs (+100 pages) with optimized processing

**Core Implementation**: `app/utils/documentUtils.ts` contains the main extraction functions:
- `extractTextFromPDF(file)`: Main PDF text extraction function
- `extractPageText(pdfDocument, pageNum)`: Extracts text from a specific page
- `processTextContent(textContent)`: Processes text content while maintaining basic structure

### DOCX Processing

Text extraction from Word documents (.docx) is implemented using the `jszip` library:

1. The DOCX file is treated as a ZIP file
2. The content of `word/document.xml` is extracted
3. Regular expressions locate and extract text within `<w:t>` tags

**Core Implementation**: `extractTextFromDOCX(file)` in `app/utils/documentUtils.ts`

### Image Processing

Images are handled for direct visualization in the chat interface:

1. Loaded via FileReader as DataURL
2. Displayed as thumbnails in the FilePreview component
3. Included as part of the message context

Supported image formats: JPG, JPEG, PNG, GIF, WebP, and SVG.

### Text Processing

Text files (.txt) are processed for:
1. Direct extraction of their content via FileReader
2. Preview in the chat component
3. Inclusion as plain text in the message context

### Markdown Processing

Markdown files (.md) are:
1. Loaded as text
2. Rendered with Markdown syntax in the interface
3. Included in the message context

## User Interface

### Loading Files

There are two ways to load files in the system:

1. **Direct upload**: Click the upload button or drag and drop files
2. **Paste**: Paste images or content directly into the input field

### Visual Feedback

The system provides visual feedback during processing:

- **PDFs**: 
  - Progress indicator during text extraction
  - Thumbnail of the first page when available
  - Page counter
  - Status messages for success or error

- **Images**:
  - Thumbnail with image preview
  - File size

- **Other documents**:
  - File type icon
  - File name and size

### Size Limitations

- Maximum file size: 100MB (configurable in `MAX_FILE_SIZE`)
- Files larger than the limit are rejected with a warning to the user

## Known Limitations

1. **PDF text extraction**:
   - Scanned PDFs without OCR don't have extractable text
   - PDFs with DRM protections may not be processed
   - Complex layouts may lose some formatting

2. **DOCX extraction**:
   - Advanced formatting and non-textual elements are ignored
   - Tables and complex layouts may lose structure

3. **Images**:
   - Maximum resolution limited by browser memory constraints
   - Less common formats may not be supported

## Possible Future Improvements

1. **OCR Support**: Add OCR for scanned PDFs
2. **Better Layout Preservation**: Improve preservation of document visual structure
3. **Support for More Formats**: Add support for DOC, RTF, XLS, etc.
4. **Image Compression**: Implement image compression for large files
5. **Integrated PDF Viewer**: Page-by-page PDF document navigation
6. **Annotations**: Allow markings and annotations on documents
7. **Selective Extraction**: Allow selecting specific parts of documents for sending

## API Usage

For developers who want to use text extraction functions programmatically:

```typescript
import { extractTextFromDocument } from '~/utils/documentUtils';

// Extract text from any supported document
async function processUserDocument(file: File) {
  try {
    const extractedText = await extractTextFromDocument(file);
    console.log('Extracted text:', extractedText);
    
    // Use the extracted text as needed
    return extractedText;
  } catch (error) {
    console.error('Error processing document:', error);
  }
}
```

---

This document processing is integrated with the chat system, allowing contextual file and document sharing to improve communication and information sharing. 