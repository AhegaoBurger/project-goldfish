// Helper to convert Uint8Array to a string for display (example)
export const uint8ArrayToString = (arr: Uint8Array | null) => {
  if (!arr) return "No data";
  try {
    return new TextDecoder().decode(arr);
  } catch (e) {
    return "Binary data (cannot display as text)";
  }
};
