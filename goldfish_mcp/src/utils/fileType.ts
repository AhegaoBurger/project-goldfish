// Helper to detect file type and mime type from binary data
export const detectFileType = (fileData: Uint8Array): { mimeType: string; extension: string; type: string } => {
  let mimeType = "application/octet-stream"; // default mime type
  let extension = "bin"; // default extension
  let type = "unknown";

  // Check file header (magic numbers)
  const fileHeader = fileData.slice(0, 4);
  
  if (fileHeader.length >= 4) {
    if (fileHeader[0] === 0xFF && fileHeader[1] === 0xD8) {
      mimeType = "image/jpeg";
      extension = "jpg";
      type = "image";
    } else if (
      fileHeader[0] === 0x89 && fileHeader[1] === 0x50 &&
      fileHeader[2] === 0x4E && fileHeader[3] === 0x47
    ) {
      mimeType = "image/png";
      extension = "png";
      type = "image";
    } else if (fileHeader[0] === 0x47 && fileHeader[1] === 0x49 && fileHeader[2] === 0x46) {
      mimeType = "image/gif";
      extension = "gif";
      type = "image";
    } else if (
      fileHeader[0] === 0x25 && fileHeader[1] === 0x50 &&
      fileHeader[2] === 0x44 && fileHeader[3] === 0x46
    ) {
      mimeType = "application/pdf";
      extension = "pdf";
      type = "pdf";
    } else {
      // Try to detect if it's text by checking a larger sample
      try {
        const textSample = new TextDecoder().decode(fileData.slice(0, 100));
        // Check for common programming language patterns
        if (/^[\x20-\x7E\n\r\t]*$/.test(textSample)) {
          if (textSample.includes('<?xml')) {
            mimeType = 'application/xml';
            extension = 'xml';
            type = 'code';
          } else if (textSample.includes('<?php') || textSample.match(/^<\?php/i)) {
            mimeType = 'application/x-php';
            extension = 'php';
            type = 'code';
          } else if (textSample.includes('<!DOCTYPE html') || textSample.includes('<html')) {
            mimeType = 'text/html';
            extension = 'html';
            type = 'code';
          } else if (textSample.match(/^{[\s\n]*"/)) {
            mimeType = 'application/json';
            extension = 'json';
            type = 'json';
          } else if (textSample.match(/^(import|package)\s+[a-z]/im)) {
            mimeType = 'text/x-java';
            extension = 'java';
            type = 'code';
          } else if (textSample.match(/^(const|let|var|function|class|import)\s+/m)) {
            mimeType = 'application/javascript';
            extension = 'js';
            type = 'code';
          } else if (textSample.match(/^(#include|#define|\s*int\s+main)/)) {
            mimeType = 'text/x-c';
            extension = 'c';
            type = 'code';
          } else if (textSample.match(/^(def\s+|class\s+|import\s+|from\s+.*import)/m)) {
            mimeType = 'text/x-python';
            extension = 'py';
            type = 'code';
          } else {
            mimeType = 'text/plain';
            extension = 'txt';
            type = 'text';
          }
        }
      } catch {
        // If decoding fails, it's likely binary data
        // Try to detect common binary formats
        if (fileData.length > 8) {
          // Check for zip
          if (fileData[0] === 0x50 && fileData[1] === 0x4B && 
              fileData[2] === 0x03 && fileData[3] === 0x04) {
            mimeType = 'application/zip';
            extension = 'zip';
            type = 'archive';
          }
          // Check for other binary formats as needed
        }
      }
    }
  }

  return { mimeType, extension, type };
};
