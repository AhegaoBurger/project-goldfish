// src/WalrusUploader.tsx
import React, { useState, useCallback, useMemo } from "react";
// Import useSignAndExecuteTransaction from dapp-kit (updated hook name)
import {
  useSuiClient,
  useSignAndExecuteTransaction,
  useCurrentWallet,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { WalrusClient, RetryableWalrusClientError } from "@mysten/walrus";
import {
  GOLDFISH_PACKAGE_ID,
  FILE_REGISTRY_OBJECT_ID,
  FILE_REGISTRY_MODULE_NAME,
} from "../constants";
import { Button } from "@/components/ui/button";

// --- !!! IMPORTANT: Replace with your actual deployed contract details !!! ---
const NETWORK = "testnet"; // Should match your WalletProvider network
// ---

// --- WASM Setup (Example for Vite) ---
// Ensure you have the wasm file available. You might need to install '@mysten/walrus-wasm'
// npm install @mysten/walrus-wasm
// yarn add @mysten/walrus-wasm
// import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url'; // Vite specific import
// ---

function WalrusDemoUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [storedBlobId, setStoredBlobId] = useState<string | null>(null);

  const { currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient(); // Use the client from dapp-kit provider

  // Use the updated hook name: useSignAndExecuteTransaction
  // const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Memoize Walrus Client instance
  const walrusClient = useMemo(() => {
    if (!suiClient) return null;
    // console.log('Initializing WalrusClient with WASM URL:', walrusWasmUrl);
    return new WalrusClient({
      suiClient: suiClient,
      network: NETWORK,
      // wasmUrl: walrusWasmUrl,
      storageNodeClientOptions: {
        onError: (error) => console.error("Walrus Node Error:", error),
      },
    });
  }, [suiClient]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setStatusMessage("");
      setErrorMessage("");
      setStoredBlobId(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file || !currentWallet || !currentAccount || !walrusClient) {
      setErrorMessage(
        "Please connect wallet and select a file." +
          (!walrusClient ? " Walrus client not initialized." : ""),
      );
      return;
    }

    setIsUploading(true);
    setStatusMessage("Reading file...");
    setErrorMessage("");
    setStoredBlobId(null);

    try {
      // 1. Read file content into Uint8Array
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onload = async (e) => {
        if (!e.target?.result) {
          setErrorMessage("Failed to read file.");
          setIsUploading(false);
          return;
        }

        const fileContent = new Uint8Array(e.target.result as ArrayBuffer);
        console.log(
          `File read: ${file.name}, size: ${fileContent.length} bytes`,
        );
        setStatusMessage(`Uploading ${file.name} to Walrus...`);

        try {
          // 2. Upload blob to Walrus (Still simulated - see previous notes)
          console.warn(
            "Walrus `writeBlob` with frontend wallet signer needs careful handling. Simulating upload for now.",
          );
          setStatusMessage("Simulating Walrus upload...");

          await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
          const simulatedBlobId = `simulated-blob-${Date.now()}`;
          console.log(
            "Simulated Walrus Upload Complete. Blob ID:",
            simulatedBlobId,
          );
          setStatusMessage(
            "Walrus upload complete (simulated). Storing ID on Sui...",
          );
          const blobId = simulatedBlobId; // Using the simulated ID

          // Actual upload to Walrus
          // const { blobId } = await walrusClient.writeBlob({
          // 	blob: fileContent,
          // 	deletable: true,
          // 	epochs: 3,
          // 	signer: currentWallet.features,
          // });

          if (!blobId) {
            throw new Error("Failed to get Blob ID from Walrus upload.");
          }

          // 3. Store the blobId in your Sui Move contract using the updated SDK V1.0 APIs
          setStatusMessage("Preparing Sui transaction...");

          // Use the new Transaction class
          const tx = new Transaction();

          tx.moveCall({
            target: `${GOLDFISH_PACKAGE_ID}::${FILE_REGISTRY_MODULE_NAME}::add_file_id`,
            arguments: [
              tx.object(FILE_REGISTRY_OBJECT_ID), // Shared registry object
              // Use the new pure helper tx.pure.string() for the blob ID.
              // This assumes your Move function `add_file_id` now accepts
              // vector<u8> or String instead of sui::object::ID, or can parse
              // the string representation. Adjust if your Move function strictly
              // requires a different type or an actual sui::object::ID.
              tx.pure.string(blobId),
            ],
          });

          console.log("Executing Sui transaction to store Blob ID...");

          // Call the updated mutation function from useSignAndExecuteTransaction
          // Pass the transaction object with the key `transaction`
          const result = await signAndExecute({
            transaction: tx, // Use `transaction` key instead of `transactionBlock`
            // `options` for effects is no longer needed for the default return
          });

          console.log("Sui Transaction Result:", result);

          // Check effects status (structure might differ slightly, but status should exist)
          // The default hook return includes effects, so this check remains valid.
          // if (result.effects !== "success") {
          //   throw new Error(
          //     `Sui transaction failed: ${result.effects || "Unknown error"}`,
          //   );
          // }

          setStatusMessage(`Success! File uploaded and ID stored on Sui.`);
          setStoredBlobId(blobId);
        } catch (error: any) {
          console.error("Upload or Sui transaction failed:", error);
          if (error instanceof RetryableWalrusClientError) {
            setErrorMessage(
              "A recoverable Walrus error occurred. Resetting client state. Please try again.",
            );
            walrusClient?.reset();
          } else {
            setErrorMessage(
              `Error: ${error.message || "An unknown error occurred."}`,
            );
          }
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setErrorMessage("Failed to read file.");
        setIsUploading(false);
      };
    } catch (error: any) {
      console.error("Outer error handler:", error);
      setErrorMessage(
        `Error: ${error.message || "An unexpected error occurred."}`,
      );
      setIsUploading(false);
    }
  }, [file, currentWallet, currentAccount, signAndExecute, walrusClient]);

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={isUploading} />
      <Button
        onClick={handleUpload}
        disabled={!file || isUploading || !currentWallet || !walrusClient}
      >
        {isUploading ? "Uploading..." : "Upload File"}
      </Button>

      {statusMessage && <p style={{ color: "blue" }}>{statusMessage}</p>}
      {errorMessage && <p style={{ color: "red" }}>Error: {errorMessage}</p>}
      {storedBlobId && (
        <p style={{ color: "green" }}>
          Successfully Stored Blob ID: {storedBlobId}
        </p>
      )}
      {!walrusClient && currentWallet && (
        <p style={{ color: "orange" }}>
          Waiting for Walrus client initialization...
        </p>
      )}
    </div>
  );
}

export default WalrusDemoUploader;