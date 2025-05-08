// src/hooks/useUserDynamicFieldValues.ts
import { useState, useEffect, useCallback } from "react";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import type { DynamicFieldInfo, SuiObjectResponse } from "@mysten/sui/client";

// Defines the structure of the object found in `field.data.content.fields`
// Based on your logs: { id: { id: '...' }, name: '0xUSER_ADDRESS', value: ['...'] }
interface DynamicFieldActualContent {
  id: { id: string }; // The object ID of the 'id' field within the struct
  name: string; // This is assumed to be the user's address
  value: string[]; // The array of string values we want
  // Add any other fields if they exist within this structure
}

// Defines the expected structure from getDynamicFieldObject's response,
// focusing on the data path we need.
interface FetchedDynamicFieldObject {
  data?: {
    content?: {
      dataType: "moveObject"; // Expecting a Move object
      fields: DynamicFieldActualContent;
      hasPublicTransfer: boolean;
      type: string;
    };
    digest: string;
    objectId: string;
    version: string;
    // Other fields from SuiObjectResponse like error, owner, etc.
  };
  error?: any; // Capture potential errors from getDynamicFieldObject
}

// Define the return type of the hook
export interface UseUserDynamicFieldValuesState {
  userValues: string[][]; // Array of 'value' arrays specific to the current user
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Props for the hook
export interface UseUserDynamicFieldValuesProps {
  parentId: string; // The parent object ID whose dynamic fields are being queried
}

export function useUserDynamicFieldValues({
  parentId,
}: UseUserDynamicFieldValuesProps): UseUserDynamicFieldValuesState {
  const [userValues, setUserValues] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount(); // Get the currently connected account

  const fetchData = useCallback(async () => {
    // Ensure client and parentId are present
    if (!suiClient || !parentId) {
      setUserValues([]);
      setIsLoading(false);
      // Optionally set an error or just return if essentials are missing
      // setError(parentId ? null : "Parent ID is required.");
      return;
    }

    // If no account is connected, we can't filter by user.
    // Decide behavior: show nothing, show all, or show error.
    // For "only returns values for the currently connected wallet", we show nothing.
    if (!currentAccount?.address) {
      setUserValues([]);
      setIsLoading(false);
      // Optionally set an error message e.g., "Please connect your wallet."
      // setError("Please connect your wallet to view your values.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setUserValues([]); // Clear previous results

    try {
      // 1. Fetch all dynamic field entries (keys/infos)
      const fieldEntries: DynamicFieldInfo[] = [];
      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        const dynamicFieldsResponse = await suiClient.getDynamicFields({
          parentId: parentId,
          cursor: cursor,
          // limit: 50, // Optional: control page size if needed
        });

        fieldEntries.push(...dynamicFieldsResponse.data);
        cursor = dynamicFieldsResponse.nextCursor;
        hasNextPage = dynamicFieldsResponse.hasNextPage;
      }

      // 2. Fetch the actual object for each field entry and filter by user address
      const filteredUserValues: string[][] = [];

      for (const entry of fieldEntries) {
        // `entry.name` is the DynamicFieldName (key) of the dynamic field
        const fieldObjectResponse: SuiObjectResponse =
          await suiClient.getDynamicFieldObject({
            parentId: parentId,
            name: entry.name,
          });

        // Type cast for easier access and type safety
        const fieldObject = fieldObjectResponse as FetchedDynamicFieldObject;

        if (fieldObject.error) {
          console.warn(
            `Error fetching dynamic field object for key ${JSON.stringify(entry.name)}:`,
            fieldObject.error,
          );
          continue; // Skip this entry if there was an error fetching it
        }

        // Check if the data path and the critical `fields` property exist
        if (
          fieldObject.data?.content?.dataType === "moveObject" &&
          fieldObject.data.content.fields
        ) {
          const contentFields = fieldObject.data.content.fields;

          // **FILTERING STEP**: Check if the `name` field matches the current user's address
          if (
            contentFields.name &&
            contentFields.name === currentAccount.address
          ) {
            // If it matches, and `value` is a valid array, add it to our results
            if (contentFields.value && Array.isArray(contentFields.value)) {
              // Ensure all items in the value array are strings
              filteredUserValues.push(
                contentFields.value.map((item) => String(item)),
              );
            } else {
              // console.warn(`'value' array missing or not an array for user ${currentAccount.address} in field:`, entry.name);
              // Decide if an entry for this user with no 'value' items should add an empty array or be skipped.
              // filteredUserValues.push([]); // Example: Add empty array
            }
          }
        } else {
          // console.warn(`Unexpected structure or missing content for dynamic field object:`, entry.name, fieldObjectResponse);
        }
      }
      setUserValues(filteredUserValues);
    } catch (err: any) {
      console.error("Error in useUserDynamicFieldValues fetchData:", err);
      setError(
        `Failed to fetch dynamic field values: ${err.message || "Unknown error"}`,
      );
      setUserValues([]); // Ensure values are cleared on error
    } finally {
      setIsLoading(false);
    }
  }, [suiClient, parentId, currentAccount?.address]); // Dependencies for useCallback

  useEffect(() => {
    // Trigger fetchData when dependencies change.
    // fetchData itself handles the logic of not running if suiClient, parentId, or currentAccount.address are missing.
    fetchData();
  }, [fetchData]); // fetchData is memoized and its dependencies are listed above

  return { userValues, isLoading, error, refetch: fetchData };
}

// Example Usage (in a React component):
/*
import { useUserDynamicFieldValues } from "./hooks/useUserDynamicFieldValues"; // Adjust path as needed
import { useCurrentAccount } from "@mysten/dapp-kit";

function MyComponent() {
  // Replace with your actual parent object ID
  const PARENT_OBJECT_ID = "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0";
  const { userValues, isLoading, error, refetch } = useUserDynamicFieldValues({ parentId: PARENT_OBJECT_ID });
  const currentAccount = useCurrentAccount();

  if (!currentAccount?.address) {
    return <p>Please connect your wallet to see your data.</p>;
  }

  if (isLoading) return <p>Loading your values...</p>;
  if (error) return <p>Error: {error} <button onClick={refetch}>Retry</button></p>;

  return (
    <div>
      <h2>Your Associated Values:</h2>
      {userValues.length === 0 && <p>No values found for your account.</p>}
      <ul>
        {userValues.map((valueArray, index) => (
          <li key={index}>
            {JSON.stringify(valueArray)}
          </li>
        ))}
      </ul>
      <button onClick={refetch} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh Data'}
      </button>
    </div>
  );
}
*/
