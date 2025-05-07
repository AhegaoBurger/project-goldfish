import type React from "react";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, X, File as FileIcon } from "lucide-react";
// import WalrusDemoUploader from "@/components/walrus-demo-uploader";
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
  NETWORK,
} from "../constants";
import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url"; // Vite specific import

export default function FileUpload() {
  const [dragActive, setDragActive] = useState(false);
  // const [files, setFiles] = useState<File[]>([]); // original
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [storedBlobId, setStoredBlobId] = useState<string | null>(null);

  const { currentWallet } = useCurrentWallet();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient(); // Use the client from dapp-kit provider
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // Memoize Walrus Client instance
  const walrusClient = useMemo(() => {
    if (!suiClient) return null;
    // console.log('Initializing WalrusClient with WASM URL:', walrusWasmUrl);
    return new WalrusClient({
      suiClient: suiClient,
      network: NETWORK,
      wasmUrl: walrusWasmUrl,
      storageNodeClientOptions: {
        onError: (error) => console.error("Walrus Node Error:", error),
      },
    });
  }, [suiClient]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // setFiles(Array.from(e.dataTransfer.files)); // original
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      // setFiles(Array.from(e.target.files)); // original
      setFile(e.target.files[0]);
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

        const encoded = await walrusClient.encodeBlob(fileContent);

        console.log(
          `File read: ${file.name}, size: ${fileContent.length} bytes`,
        );
        setStatusMessage(`Uploading ${file.name} to Walrus...`);

        try {
          // 2. Upload blob to Walrus (Still simulated - see previous notes)
          //   console.warn(
          //     "Walrus `writeBlob` with frontend wallet signer needs careful handling. Simulating upload for now.",
          //   );
          setStatusMessage("Doing Walrus upload...");

          //   await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
          //   const simulatedBlobId = `simulated-blob-${Date.now()}`;
          //   console.log(
          //     "Simulated Walrus Upload Complete. Blob ID:",
          //     simulatedBlobId,
          //   );
          //   setStatusMessage(
          //     "Walrus upload complete (simulated). Storing ID on Sui...",
          //   );
          //   const blobId = simulatedBlobId; // Using the simulated ID

          //   Actual upload to Walrus
          const registerBlobTransaction =
            await walrusClient.registerBlobTransaction({
              blobId: encoded.blobId,
              rootHash: encoded.rootHash,
              size: file.size,
              deletable: true,
              epochs: 3,
              owner: currentAccount.address,
            });

          console.log("registerBlobTransaction", registerBlobTransaction);

          registerBlobTransaction.setSender(currentAccount.address);
          const { digest } = await signAndExecute({
            transaction: registerBlobTransaction,
          });

          console.log("digest", digest);

          const { objectChanges, effects } = await suiClient.waitForTransaction(
            {
              digest,
              options: { showObjectChanges: true, showEffects: true },
            },
          );

          console.log("objectChanges", objectChanges);
          console.log("effects", effects);

          if (effects?.status.status !== "success") {
            throw new Error("Failed to register blob");
          }

          const blobType = await walrusClient.getBlobType();

          console.log("blobType", blobType);

          const blobObject = objectChanges?.find(
            (change) =>
              change.type === "created" && change.objectType === blobType,
          );

          if (!blobObject || blobObject.type !== "created") {
            throw new Error("Blob object not found");
          }

          const confirmations = await walrusClient.writeEncodedBlobToNodes({
            blobId: encoded.blobId,
            metadata: encoded.metadata,
            sliversByNode: encoded.sliversByNode,
            deletable: true,
            objectId: blobObject.objectId,
          });

          console.log("confirmations", confirmations);

          const certifyBlobTransaction =
            await walrusClient.certifyBlobTransaction({
              blobId: encoded.blobId,
              blobObjectId: blobObject.objectId,
              confirmations,
              deletable: true,
            });

          console.log("certifyBlobTransaction", certifyBlobTransaction);

          const { digest: certifyDigest } = await signAndExecute({
            transaction: certifyBlobTransaction,
          });

          console.log("certifyDigest", certifyDigest);

          const { effects: certifyEffects } =
            await suiClient.waitForTransaction({
              digest: certifyDigest,
              options: { showEffects: true },
            });

          console.log("certifyEffects", certifyEffects);

          if (certifyEffects?.status.status !== "success") {
            throw new Error("Failed to certify blob");
          }

          // return encoded.blobId;

          if (!encoded.blobId) {
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
              tx.pure.string(encoded.blobId),
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
          setStoredBlobId(encoded.blobId);
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

  const removeFile = () => {
    // setFiles(files.filter((_, i) => i !== index)); // original
    setFile(null);
  };

  // Determine if upload button should be disabled
  const isUploadDisabled =
    !file || isUploading || !currentAccount || !walrusClient;

  return (
    <>
      {/* <WalrusDemoUploader /> */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop files to upload to your Goldfish storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? "border-amber-500 bg-amber-50" : "border-gray-300"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={handleChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="h-10 w-10 text-amber-400" />
                <p className="text-sm text-gray-600">
                  Drag & drop files here or{" "}
                  <span className="text-amber-600 font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-500">
                  Supports all file types up to 10GB
                </p>
              </div>
            </label>
          </div>

          {/* --- Selected File Display --- */}
          {file &&
            !isUploading && ( // Show only if a file is selected and not uploading
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Selected file:</p>
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <div className="flex items-center gap-2 truncate">
                    <FileIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate text-sm">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-500 hover:text-red-600"
                    onClick={removeFile} // No index needed
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

          {/* --- Status/Error/Success Messages --- */}
          {isUploading && statusMessage && (
            <p className="mt-4 text-center text-blue-600">{statusMessage}</p>
          )}
          {!isUploading && errorMessage && (
            <p className="mt-4 text-center text-red-600">
              Error: {errorMessage}
            </p>
          )}
          {!isUploading && storedBlobId && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-center">
              <p className="text-green-700 font-medium">Success! Stored ID:</p>
              <p className="font-mono text-sm text-green-800 break-all">
                {storedBlobId}
              </p>
            </div>
          )}
          {!walrusClient && currentAccount && (
            <p className="mt-4 text-center text-orange-600">
              Waiting for storage client initialization...
            </p>
          )}
          {!currentAccount && (
            <p className="mt-4 text-center text-orange-600">
              Please connect your wallet to upload.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600"
            onClick={handleUpload}
            disabled={isUploadDisabled} // Use the calculated disabled state
          >
            {isUploading ? "Processing..." : "Upload & Store ID"}{" "}
            {/* Updated text */}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
