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

// Detect file type and extension from binary data
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
        // Only consider it text if it contains printable ASCII characters
        if (/^[\x20-\x7E\n\r\t]*$/.test(textSample)) {
          mimeType = "text/plain";
          extension = "txt";
          type = "text";
        }
      } catch {
        // If decoding fails, it's likely binary data
        mimeType = "application/octet-stream";
        extension = "bin";
        type = "unknown";
      }
    }
  }

  return { mimeType, extension, type };
};

// Process a blob result into a FileItem
export const processBlobResult = async (
  blobResult: { blobId: string; error?: string; data: Uint8Array | null },
  walrusClient: any
) => {
  if (blobResult.error || !blobResult.data) {
    return {
      id: blobResult.blobId,
      objectId: "",
      name: `File (${blobResult.blobId.substring(0, 8)}...)`,
      extension: "",
      type: "unknown",
      size: "Unknown",
      lastModified: "Unknown",
      storageEpochs: 0,
      isDeletable: false,
      data: null,
      error: blobResult.error || "Failed to load file data",
    };
  }

  // Get metadata for the blob
  let metadata;
  try {
    metadata = await walrusClient.getBlobMetadata({
      blobId: blobResult.blobId,
    });
    console.log("File metadata:", metadata);
  } catch (metadataError) {
    console.error("Error getting blob metadata:", metadataError);
    metadata = null;
  }

  // Detect file type and extension
  const { extension, type } = detectFileType(blobResult.data);
  const fileName = `File-${blobResult.blobId.substring(0, 8)}.${extension}`;

  // Get file size
  const fileSize = formatFileSize(blobResult.data.byteLength);

  return {
    id: blobResult.blobId,
    objectId: "",
    name: fileName,
    extension,
    type,
    size: fileSize,
    lastModified: "Recently uploaded",
    storageEpochs: 1,
    isDeletable: true,
    data: blobResult.data,
  };
};
