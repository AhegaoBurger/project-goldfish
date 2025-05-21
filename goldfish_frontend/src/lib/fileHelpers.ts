// Helper to convert Uint8Array to a string for display
export const uint8ArrayToString = (arr: Uint8Array | null) => {
  if (!arr) return "No data";
  try {
    return new TextDecoder().decode(arr);
  } catch (e) {
    return "Binary data (cannot display as text)";
  }
};

// Format file size from bytes to human-readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Get file extension from filename
export const getFileExtension = (filename: string): string | null => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || null : null;
};

// Determine file type from data or attributes
export const getFileTypeFromData = (
  data: Uint8Array | null,
  attributes?: Record<string, string> | null,
): string => {
  // If we have a content-type attribute, use that
  if (attributes && attributes["content-type"]) {
    const contentType = attributes["content-type"];
    if (contentType.includes("image")) return "image";
    if (contentType.includes("video")) return "video";
    if (contentType.includes("audio")) return "audio";
    if (contentType.includes("pdf")) return "pdf";
    if (contentType.includes("json")) return "json";
    if (contentType.includes("spreadsheet") || contentType.includes("excel"))
      return "spreadsheet";
    if (contentType.includes("zip") || contentType.includes("archive"))
      return "archive";
    if (contentType.includes("text/plain")) return "text";
    if (
      contentType.includes("text/html") ||
      contentType.includes("javascript") ||
      contentType.includes("css")
    )
      return "code";
    return "document";
  }

  // If we have a filename attribute with extension, use that
  if (attributes && attributes["filename"]) {
    const filename = attributes["filename"];
    const extension = getFileExtension(filename);
    if (extension) {
      if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension))
        return "image";
      if (["mp4", "webm", "mov", "avi"].includes(extension)) return "video";
      if (["mp3", "wav", "ogg", "flac"].includes(extension)) return "audio";
      if (extension === "pdf") return "pdf";
      if (extension === "json") return "json";
      if (["xls", "xlsx", "csv"].includes(extension)) return "spreadsheet";
      if (["zip", "tar", "gz", "rar"].includes(extension)) return "archive";
      if (
        [
          "html",
          "js",
          "css",
          "ts",
          "py",
          "java",
          "cpp",
          "c",
          "go",
          "rs",
        ].includes(extension)
      )
        return "code";
      if (["doc", "docx", "txt", "rtf"].includes(extension)) return "document";
    }
  }

  // Try to guess from the data itself if we have it
  if (data && data.length > 4) {
    // Check for image formats
    if (
      (data[0] === 0xff && data[1] === 0xd8) || // JPEG
      (data[0] === 0x89 &&
        data[1] === 0x50 &&
        data[2] === 0x4e &&
        data[3] === 0x47) || // PNG
      (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) // GIF
    ) {
      return "image";
    }

    // Check for PDF
    if (
      data[0] === 0x25 &&
      data[1] === 0x50 &&
      data[2] === 0x44 &&
      data[3] === 0x46
    ) {
      return "pdf";
    }

    // Try to see if it's plain text
    let isText = true;
    for (let i = 0; i < Math.min(32, data.length); i++) {
      if (data[i] < 9 || (data[i] > 13 && data[i] < 32 && data[i] !== 9)) {
        isText = false;
        break;
      }
    }
    if (isText) return "text";
  }

  // Default
  return "unknown";
};
