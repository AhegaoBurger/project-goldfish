// src/hooks/useDynamicFieldValues.ts
import { useState, useEffect, useCallback } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import type { DynamicFieldInfo, SuiObjectResponse } from "@mysten/sui/client"; // More specific types

// Define the structure of the name from getDynamicFields
// This might need adjustment based on the actual type of entry.name
// If entry.name is just a string, this can be simplified.
// Assuming entry.name is an object like { type: string, value: string } which is common
// for dynamic field names. If it's directly a string, this can be simpler.
// For dynamic fields, `name` is usually DynamicFieldName which has `type` and `value`
// However, getDynamicFieldObject expects the exact `name` object received from getDynamicFields
type DynamicFieldName = {
  type: string;
  value: any; // Can be string, number, object, etc. depending on the field key type
};

// Define the expected structure of the dynamic field object's data
// This is a guess based on `field.data?.content.fields.value`
interface DynamicFieldObjectData {
  data?: {
    content?: {
      fields?: {
        value: string[]; // Based on your console output, value is an array of strings
      };
    };
    // If it's not a Move object but a raw value, it might be under `display`
    // display?: any; // Alternative path for raw values
  };
  // Other fields from SuiObjectResponse like error, owner, etc.
}

// Define the return type of the hook
export interface UseDynamicFieldValuesState {
  values: string[][]; // Based on your console output: [ ['id1'], ['id2', 'id3'], ... ]
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Props for the hook
export interface UseDynamicFieldValuesProps {
  parentId: string;
  // You could add other options here if needed, like initialCursor, pageSize etc.
}

export function useDynamicFieldValues({
  parentId,
}: UseDynamicFieldValuesProps): UseDynamicFieldValuesState {
  const [values, setValues] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const suiClient = useSuiClient();

  const fetchData = useCallback(async () => {
    if (!suiClient || !parentId) {
      setValues([]);
      setIsLoading(false);
      // Optionally set an error if parentId is missing but suiClient is present
      // setError(parentId ? null : "Parent ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setValues([]); // Clear previous results

    try {
      // 1. Fetch all dynamic field entries (names/identifiers)
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

      // 2. Fetch the actual object for each field entry and extract the value
      const fetchedValues: string[][] = [];

      for (const entry of fieldEntries) {
        // The `name` from `DynamicFieldInfo` is what `getDynamicFieldObject` expects.
        // It's an object like: { type: "0x...::module::StructName", value: "..." }
        // or { type: "u64", value: "123" }
        const fieldObjectResponse: SuiObjectResponse =
          await suiClient.getDynamicFieldObject({
            parentId: parentId,
            name: entry.name, // entry.name is the DynamicFieldName object
          });

        // Assuming the structure `field.data.content.fields.value`
        // Adjust this path if your object structure is different
        const fieldValue = (fieldObjectResponse as DynamicFieldObjectData).data
          ?.content?.fields?.value;

        if (fieldValue && Array.isArray(fieldValue)) {
          // Ensure all elements in fieldValue are strings, or handle mixed types
          fetchedValues.push(fieldValue.map((item) => String(item)));
        } else {
          // Handle cases where value might be missing or not an array as expected
          console.warn(
            `Value not found or not an array for field:`,
            entry.name,
            fieldObjectResponse,
          );
          // Optionally push an empty array or skip
          // fetchedValues.push([]);
        }
      }
      setValues(fetchedValues);
    } catch (err: any) {
      console.error("Error in useDynamicFieldValues fetchData:", err);
      setError(
        `Failed to fetch dynamic field values: ${err.message || "Unknown error"}`,
      );
      setValues([]); // Ensure values are cleared on error
    } finally {
      setIsLoading(false);
    }
  }, [suiClient, parentId]); // Dependencies for useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData is memoized by useCallback, so this runs when suiClient or parentId changes

  return { values, isLoading, error, refetch: fetchData };
}

// Example Usage (in a component):
/*
import { useDynamicFieldValues } from "./hooks/useDynamicFieldValues"; // Adjust path

function MyComponent() {
  const MY_PARENT_OBJECT_ID = "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0"; // Example
  const { values, isLoading, error, refetch } = useDynamicFieldValues({ parentId: MY_PARENT_OBJECT_ID });

  if (isLoading) return <p>Loading dynamic field values...</p>;
  if (error) return <p>Error: {error} <button onClick={refetch}>Retry</button></p>;

  return (
    <div>
      <h2>Dynamic Field Values:</h2>
      {values.length === 0 && <p>No values found.</p>}
      <ul>
        {values.map((valueArray, index) => (
          <li key={index}>
            {JSON.stringify(valueArray)}
          </li>
        ))}
      </ul>
      <button onClick={refetch}>Refresh Data</button>
    </div>
  );
}
*/
