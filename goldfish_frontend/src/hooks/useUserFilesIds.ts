// src/hooks/useUserFileContents.ts
import { useState, useEffect, useCallback } from "react";
import {
  useSuiClient,
  useCurrentAccount,
  // useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import type {
  // SuiClient,
  DynamicFieldInfo,
  SuiObjectResponse,
} from "@mysten/sui/client";
import { BlobNotCertifiedError } from "@mysten/walrus";
import { walrusClient } from "./useWalrus";

// --- Type Definitions ---

// Structure of the object within field.data.content.fields
interface DynamicFieldActualContent {
  id: { id: string };
  name: string; // Expected to be the user's address
  value: string[]; // Array of blob IDs
}

// Expected structure from getDynamicFieldObject's response
interface FetchedDynamicFieldObject {
  data?: {
    content?: {
      dataType: "moveObject";
      fields: DynamicFieldActualContent;
      hasPublicTransfer: boolean;
      type: string; // e.g., "0xpackage::module::StructName"
    };
    // Other fields from SuiObjectResponse
    digest: string;
    objectId: string;
    version: string;
  };
  error?: any; // Error from getDynamicFieldObject call itself
}

// Represents the fetched content (or error) for a single blob
export interface BlobFetchResult {
  blobId: string;
  data: Uint8Array | null; // Uint8Array if successful, null if error
  error?: string; // Error message if fetching this specific blob failed
}

// Return type of the hook
export interface UseUserFileContentsState {
  // Each inner array corresponds to one 'value' (list of blobIds) from a user-specific dynamic field.
  // It contains the fetched content for each blobId in that list.
  userFileGroups: Array<BlobFetchResult[]>;
  isLoading: boolean; // Overall loading state for the entire fetch process
  error: string | null; // General error for the hook (e.g., failed to get dynamic fields, major issue)
  refetch: () => void;
}

// Props for the hook
export interface UseUserFileContentsProps {
  parentId: string; // Parent object ID for dynamic fields
  // walrusClient: WalrusClient | null; // The Walrus client instance for reading blobs
}

export function useUserFileContents({
  parentId,
  // walrusClient,
}: UseUserFileContentsProps): UseUserFileContentsState {
  const [userFileGroups, setUserFileGroups] = useState<
    Array<BlobFetchResult[]>
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  // const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Helper function to get blob status and attempt certification if needed
  const getVerifiedBlobStatus = useCallback(
    async (blobId: string): Promise<boolean> => {
      if (!walrusClient) return false;

      try {
        // First check the blob status
        const status = await walrusClient.getVerifiedBlobStatus({ blobId });
        console.log(`Blob ${blobId} status:`, status);

        // If the blob exists and is verified, we're good
        return true;
      } catch (err) {
        console.warn(`Error getting blob status for ${blobId}:`, err);
        return false;
      }
    },
    [],
  );

  const fetchData = useCallback(async () => {
    // Initial checks for required dependencies
    if (!suiClient || !parentId) {
      setUserFileGroups([]);
      setIsLoading(false);
      // setError(parentId ? null : "Parent ID is required."); // Optional: specific error
      return;
    }
    if (!currentAccount?.address) {
      setUserFileGroups([]);
      setIsLoading(false);
      // setError("Please connect your wallet."); // Optional: specific error
      return;
    }
    if (!walrusClient) {
      setUserFileGroups([]);
      setIsLoading(false);
      setError("Walrus client is not configured or provided.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setUserFileGroups([]);

    try {
      // 1. Fetch all dynamic field entries (infos/keys)
      const fieldEntries: DynamicFieldInfo[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;
      while (hasNextPage) {
        const dynamicFieldsResponse = await suiClient.getDynamicFields({
          parentId: parentId,
          cursor: cursor,
          // limit: 50, // Optional: control page size
        });
        fieldEntries.push(...dynamicFieldsResponse.data);
        cursor = dynamicFieldsResponse.nextCursor;
        hasNextPage = dynamicFieldsResponse.hasNextPage;
      }

      // 2. For each field entry, create a promise to:
      //    a. Fetch the full dynamic field object.
      //    b. Filter if it belongs to the current user.
      //    c. If yes, extract blob IDs and fetch their content using WalrusClient.
      const processingPromises: Promise<BlobFetchResult[] | null>[] =
        fieldEntries.map(
          (entry) =>
            (async (): Promise<BlobFetchResult[] | null> => {
              try {
                const fieldObjectResponse: SuiObjectResponse =
                  await suiClient.getDynamicFieldObject({
                    parentId: parentId,
                    name: entry.name, // entry.name is the DynamicFieldName
                  });

                const fieldObject =
                  fieldObjectResponse as FetchedDynamicFieldObject;

                if (fieldObject.error) {
                  console.warn(
                    `Error fetching dynamic field object for key ${JSON.stringify(entry.name)}:`,
                    fieldObject.error,
                  );
                  return null; // Skip this entry due to fetch error
                }

                if (
                  fieldObject.data?.content?.dataType === "moveObject" &&
                  fieldObject.data.content.fields
                ) {
                  const contentFields = fieldObject.data.content.fields;

                  // Filter: Check if this dynamic field's 'name' matches the current user's address
                  if (
                    contentFields.name &&
                    contentFields.name === currentAccount.address
                  ) {
                    if (
                      contentFields.value &&
                      Array.isArray(contentFields.value)
                    ) {
                      const blobIds: string[] = contentFields.value.map((id) =>
                        String(id),
                      );

                      if (blobIds.length === 0) {
                        return []; // User's entry, but no blob IDs in its 'value' array
                      }

                      // Fetch all blobs for this group of IDs
                      const blobFetchResultsPromises = blobIds.map(
                        async (blobId) => {
                          try {
                            // First check blob status
                            await getVerifiedBlobStatus(blobId);

                            // Try to read the blob
                            try {
                              const blobData = await walrusClient!.readBlob({
                                blobId,
                              });
                              console.log("we got blob data", blobData);
                              console.log(
                                "readable: ",
                                blobData.buffer as ArrayBuffer,
                              );
                              return {
                                blobId,
                                data: blobData,
                                error: undefined,
                              };
                            } catch (readError) {
                              // If the blob is not certified, we'll get a specific error
                              if (readError instanceof BlobNotCertifiedError) {
                                console.log(
                                  `Blob ${blobId} is not certified. Cannot read without certification.`,
                                );
                              }
                              return {
                                blobId,
                                data: null,
                                error:
                                  readError instanceof Error
                                    ? readError.message
                                    : String(readError),
                              };
                            }
                          } catch (blobError: any) {
                            console.error(
                              `Failed to process blob ${blobId}:`,
                              blobError,
                            );
                            return {
                              blobId,
                              data: null,
                              error:
                                blobError instanceof Error
                                  ? blobError.message
                                  : String(blobError),
                            };
                          }
                        },
                      );
                      return Promise.all(blobFetchResultsPromises); // Returns BlobFetchResult[]
                    } else {
                      // User's entry, but 'value' is missing, not an array, or malformed
                      return []; // Represent as an empty group of blobs
                    }
                  } else {
                    return null; // Not for the current user, skip
                  }
                } else {
                  // Dynamic field object structure wasn't as expected
                  console.warn(
                    `Unexpected structure or missing content for dynamic field object:`,
                    entry.name,
                    fieldObjectResponse,
                  );
                  return null; // Skip due to unexpected structure
                }
              } catch (processEntryError: any) {
                // Catch errors during the processing of a single entry (e.g., unexpected issues)
                console.error(
                  `Error processing entry ${JSON.stringify(entry.name)}:`,
                  processEntryError,
                );
                return null; // Indicate failure for this entry, effectively skipping it
              }
            })(), // Immediately Invoked Function Expression (IIFE) to create and start the promise
        );

      // Wait for all processing promises (each handling one dynamic field entry) to settle
      const settledResults = await Promise.all(processingPromises);

      // Filter out nulls (entries that were skipped, not for the user, or had errors)
      // and type assert correctly.
      const finalUserFileGroups = settledResults.filter(
        (group) => group !== null,
      ) as Array<BlobFetchResult[]>;
      setUserFileGroups(finalUserFileGroups);
    } catch (err: any) {
      // Catch major errors in the overall fetchData logic (e.g., getDynamicFields failing completely)
      console.error("Error in useUserFileContents fetchData:", err);
      setError(
        `Failed to fetch file contents: ${err.message || "Unknown error"}`,
      );
      setUserFileGroups([]); // Ensure state is cleared on major error
    } finally {
      setIsLoading(false);
    }
  }, [suiClient, parentId, currentAccount?.address, getVerifiedBlobStatus]); // Dependencies for useCallback

  useEffect(() => {
    fetchData(); // Call fetchData when dependencies change
  }, [fetchData]); // fetchData is memoized by useCallback

  return { userFileGroups, isLoading, error, refetch: fetchData };
}

// Example Usage (in a React component):
/*
import { useUserFileContents, WalrusClient } from "./hooks/useUserFileContents"; // Adjust path
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SomeWalrusClientImplementation } from 'your-walrus-library'; // Your actual client

function MyFilesDisplay() {
  const PARENT_OBJECT_ID = "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0"; // Your parent ID
  const currentAccount = useCurrentAccount();

  // Instantiate or get your WalrusClient. This might come from a context, props, or be created here.
  // For this example, let's assume you instantiate it.
  // Ensure it's memoized if created directly in the component to prevent re-renders of the hook.
  const walrusClientInstance: WalrusClient | null = useMemo(() => {
    // Replace with your actual WalrusClient setup
    // This is just a placeholder:
    if (typeof SomeWalrusClientImplementation !== 'undefined') {
        return new SomeWalrusClientImplementation({ rpcUrl: "your_rpc_url_if_needed" });
    }
    return null;
  }, []);


  const { userFileGroups, isLoading, error, refetch } = useUserFileContents({
    parentId: PARENT_OBJECT_ID,
    walrusClient: walrusClientInstance,
  });

  if (!currentAccount?.address) {
    return <p>Please connect your wallet.</p>;
  }
  if (!walrusClientInstance) {
      return <p>File service client is not available.</p>
  }

  if (isLoading) return <p>Loading your file contents...</p>;
  if (error) return <p>Error loading files: {error} <button onClick={refetch}>Retry</button></p>;

  // Helper to convert Uint8Array to a string for display (example)
  const uint8ArrayToString = (arr: Uint8Array | null) => {
    if (!arr) return "No data";
    try {
      return new TextDecoder().decode(arr);
    } catch (e) {
      return "Binary data (cannot display as text)";
    }
  };

  return (
    <div>
      <h2>Your Files:</h2>
      {userFileGroups.length === 0 && <p>No files found for your account or all groups were empty.</p>}
      {userFileGroups.map((fileGroup, groupIndex) => (
        <div key={groupIndex} style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h3>File Group {groupIndex + 1} (from one dynamic field)</h3>
          {fileGroup.length === 0 && <p>This group is empty.</p>}
          <ul>
            {fileGroup.map((fileResult, fileIndex) => (
              <li key={`${groupIndex}-${fileResult.blobId}-${fileIndex}`}>
                <strong>Blob ID:</strong> {fileResult.blobId}
                <br />
                {fileResult.error ? (
                  <span style={{ color: 'red' }}>Error: {fileResult.error}</span>
                ) : (
                  <>
                    <strong>Content (first 100 chars):</strong>
                    <pre>{uint8ArrayToString(fileResult.data)?.substring(0,100) || "Empty content"}</pre>
                    {fileResult.data && <p>(Size: {fileResult.data.byteLength} bytes)</p>}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button onClick={refetch} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh File Contents'}
      </button>
    </div>
  );
}
*/
