import { Server as McpServerRaw } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource as McpResource,
  ResourceContents as McpResourceContent,
  CallToolResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

import {
  getFullnodeUrl,
  SuiClient,
  SuiObjectResponse,
} from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions"; // Corrected import
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { WalrusClient, BlobNotCertifiedError } from "@mysten/walrus";
import { Buffer } from "node:buffer";
import { detectFileType } from "./utils/fileType.js";
import {
  SYSTEM_OBJECT_ID,
  STAKING_POOL_ID,
  SUBSIDIES_OBJECT_ID,
  EXCHANGGE_IDS,
} from "./constants.js";
// import walrusWasmUrl from "@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url"; // Vite specific import

// --- Configuration Interface ---
interface GoldfishConfig {
  walletAddress: string;
  serverPrivateKeyHex?: string; // Optional, but needed for signing Sui transactions
}

// --- Constants ---
const GOLDFISH_PACKAGE_ID =
  "0xd7da3d972c99d9318eb56df786b8b04e120a7769d572f537d920f40334388dd6";
const FILE_REGISTRY_OBJECT_ID = // Used in the 'add_file_id' move call
  "0xa2b58dd03872c5bd0f337b13056eb50f9160848329efd9ad965f63e8aac1bc67";
const TABLE_OBJECT_ID = // Parent object for dynamic fields containing user's blob_ids
  "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0";
const FILE_REGISTRY_MODULE_NAME = "goldfish_backend";
const NETWORK = "testnet";
const GOLDFISH_URI_SCHEME = "goldfish";

let config: GoldfishConfig;
let serverKeypair: Ed25519Keypair | undefined;

// --- Client Initializations ---
const suiClient = new SuiClient({
  url: getFullnodeUrl(NETWORK),
});

const walrusClient = new WalrusClient({
  network: NETWORK,
  suiClient,
  wasmUrl:
    "https://unpkg.com/@mysten/walrus-wasm@0.0.6/web/walrus_wasm_bg.wasm",
  storageNodeClientOptions: {
    timeout: 60_000,
    onError: (error) => console.error("Walrus Node Error:", error),
  },
  packageConfig: {
    systemObjectId: SYSTEM_OBJECT_ID,
    stakingPoolId: STAKING_POOL_ID,
    subsidiesObjectId: SUBSIDIES_OBJECT_ID,
    exchangeIds: EXCHANGGE_IDS,
  },
});

// --- MCP Server Instance ---
const server = new McpServerRaw(
  {
    name: "goldfish",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: { listChanged: false, subscribe: false }, // Enable resource capabilities
      tools: { listChanged: false },
    },
  },
);

// --- Helper: Sui Transaction Execution ---
async function executeSuiTransaction(transaction: Transaction) {
  if (!serverKeypair) {
    throw new Error(
      "Server private key not configured. Cannot sign Sui transactions.",
    );
  }
  transaction.setSender(config.walletAddress); // Ensure sender is set
  return suiClient.signAndExecuteTransaction({
    transaction: transaction,
    signer: serverKeypair,
    options: { showObjectChanges: true, showEffects: true, showEvents: true },
  });
}

// --- Resource Handlers ---

// Expected structure from getDynamicFieldObject's response based on frontend hook
interface DynamicFieldSuiObjectContent {
  id: { id: string };
  name: string; // Expected to be the user's address (config.walletAddress)
  value: string[]; // Array of blob IDs
}

server.setRequestHandler(
  ListResourcesRequestSchema,
  async (
    request,
  ): Promise<{ resources: McpResource[]; nextCursor?: string }> => {
    console.error(`[Resources/List] For wallet: ${config.walletAddress}`);
    const userBlobIds: string[] = [];

    try {
      let hasNextPage = true;
      let cursor: string | null = null;
      console.error(
        `[Resources/List] Fetching dynamic fields for parentId: ${TABLE_OBJECT_ID}`,
      );

      while (hasNextPage) {
        const dynamicFieldsResponse = await suiClient.getDynamicFields({
          parentId: TABLE_OBJECT_ID,
          cursor: cursor,
          limit: 50, // Adjust limit as needed
        });

        console.error(
          `[Resources/List] Fetched ${dynamicFieldsResponse.data.length} dynamic field infos.`,
        );

        for (const fieldInfo of dynamicFieldsResponse.data) {
          // The name of the dynamic field for this table structure is an address.
          // We need to ensure it's the type that matches our user's address.
          // Type from fieldInfo.name.type should be 'address' or match expected structure.
          // The actual address is in fieldInfo.name.value
          if (
            typeof fieldInfo.name.value === "string" &&
            fieldInfo.name.value.toLowerCase() ===
              config.walletAddress.toLowerCase()
          ) {
            console.error(
              `[Resources/List] Found dynamic field for user: ${fieldInfo.name.value}`,
            );
            const fieldObjectResponse: SuiObjectResponse =
              await suiClient.getDynamicFieldObject({
                parentId: TABLE_OBJECT_ID,
                name: fieldInfo.name,
              });

            if (fieldObjectResponse.data?.content?.dataType === "moveObject") {
              const fieldsData = fieldObjectResponse.data.content.fields as {
                id: { id: string };
                name: string;
                value: string[];
              };

              const idFromFields = fieldsData?.id;
              const nameFromFields = fieldsData?.name;
              const valueFromFields = fieldsData?.value;

              if (
                idFromFields &&
                typeof idFromFields.id === "string" &&
                typeof nameFromFields === "string" && // Should match config.walletAddress
                Array.isArray(valueFromFields) &&
                valueFromFields.every((item) => typeof item === "string")
              ) {
                // No need to construct DynamicFieldSuiObjectContent if only 'value' is needed
                userBlobIds.push(...valueFromFields);
                console.error(
                  `[Resources/List] Added ${valueFromFields.length} blob IDs from dynamic field owned by ${nameFromFields}.`,
                );
              } else {
                console.warn(
                  `[Resources/List] Dynamic field for user ${config.walletAddress} (key: ${fieldInfo.name.value}) has unexpected structure in 'fields':`,
                  fieldsData,
                );
              }
            }
          }
        }
        cursor = dynamicFieldsResponse.nextCursor;
        hasNextPage = dynamicFieldsResponse.hasNextPage;
        if (hasNextPage)
          console.error(
            `[Resources/List] Fetching next page with cursor: ${cursor}`,
          );
      }
      console.error(
        `[Resources/List] Total blob IDs found for user: ${userBlobIds.length}`,
      );

      const resources: McpResource[] = userBlobIds.map((blobId) => ({
        uri: `${GOLDFISH_URI_SCHEME}://blob/${blobId}`,
        name: `Goldfish File ${blobId.substring(0, 8)}...`, // Or fetch actual filename if stored
        description: `Stored file with Blob ID: ${blobId}`,
        mimeType: "application/octet-stream", // Ideally, fetch metadata for a more accurate type
      }));

      return { resources };
    } catch (error) {
      console.error(`[Resources/List] Error fetching resources:`, error);
      // Return empty or throw, depending on desired behavior for partial failures
      return { resources: [] };
    }
  },
);

server.setRequestHandler(
  ReadResourceRequestSchema,
  async (request): Promise<{ contents: McpResourceContent[] }> => {
    const uri = request.params.uri;
    console.error(`[Resources/Read] URI: ${uri}`);
    const parsedUrl = new URL(uri);
    const parts = parsedUrl.pathname.substring(1).split("/"); // e.g., blob/0x123...

    if (
      parsedUrl.protocol.replace(":", "") !== GOLDFISH_URI_SCHEME ||
      parts[0] !== "blob" ||
      !parts[1]
    ) {
      throw new Error(`Invalid Goldfish resource URI format: ${uri}`);
    }

    const blobId = parts[1];
    const contents: McpResourceContent[] = [];

    try {
      // 1. Fetch Metadata
      console.error(`[Resources/Read] Fetching metadata for blob: ${blobId}`);
      const metadata = await walrusClient.getBlobMetadata({ blobId });
      contents.push({
        uri: `${GOLDFISH_URI_SCHEME}://blob/${blobId}?type=metadata`, // Specific URI for metadata part
        mimeType: "application/json",
        text: JSON.stringify(metadata, null, 2),
      } as McpResourceContent);
      console.error(`[Resources/Read] Fetched metadata successfully.`);

      // 2. Fetch Content and detect mime type
      console.error(`[Resources/Read] Fetching content for blob: ${blobId}`);
      const contentBytes = await walrusClient.readBlob({ blobId });
      console.error(
        `[Resources/Read] Fetched content successfully (${contentBytes.byteLength} bytes).`,
      );

      // Detect file type from content
      const { mimeType, type } = detectFileType(new Uint8Array(contentBytes));

      try {
        const textContent = new TextDecoder("utf-8", { fatal: true }).decode(
          contentBytes,
        );
        contents.push({
          uri: `${GOLDFISH_URI_SCHEME}://blob/${blobId}?type=content`,
          mimeType: mimeType, // Use detected mime type
          text: textContent,
        } as McpResourceContent);
      } catch (e) {
        // Not valid UTF-8, treat as binary
        contents.push({
          uri: `${GOLDFISH_URI_SCHEME}://blob/${blobId}?type=content`,
          mimeType: mimeType, // Use detected mime type
          blob: Buffer.from(contentBytes).toString("base64"),
        } as McpResourceContent);
      }
      return { contents };
    } catch (error) {
      console.error(`[Resources/Read] Error reading blob ${blobId}:`, error);
      if (error instanceof BlobNotCertifiedError) {
        return {
          contents: [
            {
              uri, // Original URI for context
              mimeType: "application/json", // Error message
              text: JSON.stringify({
                error: "BlobNotCertifiedError",
                message:
                  "Blob is not certified yet. Please wait for certification.",
              }),
            } as McpResourceContent,
          ],
        };
      }
      // For other errors, let the MCP framework handle it by re-throwing
      throw new Error(
        `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
);

// --- Tool Definitions and Handlers ---
const UPLOAD_FILE_TOOL_DEF: Tool = {
  name: "upload_goldfish_file", // Renamed for clarity
  description:
    "Upload a single file to Goldfish storage for the configured wallet address.",
  inputSchema: {
    type: "object",
    properties: {
      filename: {
        type: "string",
        description: "Name of the file being uploaded",
      },
      content_base64: {
        type: "string",
        description: "Base64 encoded content of the file",
      },
      storage_epochs: {
        type: "number",
        description: "Number of epochs to store the file (default: 3)",
      },
    },
    required: ["filename", "content_base64"],
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      UPLOAD_FILE_TOOL_DEF /*, Add UPLOAD_FILES_TOOL_DEF if implemented */,
    ],
  };
});

server.setRequestHandler(
  CallToolRequestSchema,
  async (request): Promise<CallToolResult> => {
    const { name, arguments: args } = request.params;
    const toolArgs = args as any;
    console.error(
      `[Tool/${name}] Called with args:`,
      toolArgs ? JSON.stringify(toolArgs).substring(0, 100) + "..." : "No args",
    );

    if (!serverKeypair) {
      const errMsg =
        "Server private key not configured. Cannot execute tools requiring Sui transactions.";
      console.error(`[Tool/${name}] Error: ${errMsg}`);
      return {
        content: [{ type: "text", text: errMsg } as TextContent],
        isError: true,
      };
    }

    try {
      switch (name) {
        case UPLOAD_FILE_TOOL_DEF.name: {
          const {
            filename,
            content_base64,
            storage_epochs = 3,
          } = toolArgs as {
            filename: string;
            content_base64: string;
            storage_epochs?: number;
          };

          console.error(`[Tool/${name}] Processing file: ${filename}`);
          const fileContent = new Uint8Array(
            Buffer.from(content_base64, "base64"),
          );

          // 1. Walrus: Encode
          console.error(`[Tool/${name}] Encoding blob...`);
          const encoded = await walrusClient.encodeBlob(fileContent);
          console.error(`[Tool/${name}] Encoded blobId: ${encoded.blobId}`);

          // 2. Walrus: Register Blob Transaction (Sui Tx)
          console.error(`[Tool/${name}] Creating registerBlobTransaction...`);
          const registerTx = await walrusClient.registerBlobTransaction({
            blobId: encoded.blobId,
            rootHash: encoded.rootHash,
            size: fileContent.length,
            deletable: true,
            epochs: storage_epochs,
            owner: config.walletAddress,
          });
          console.error(`[Tool/${name}] Executing registerBlobTransaction...`);
          const registerResult = await executeSuiTransaction(registerTx);
          console.error(
            `[Tool/${name}] registerBlobTransaction digest: ${registerResult.digest}`,
          );
          if (registerResult.effects?.status.status !== "success") {
            throw new Error(
              `Failed to register blob on Sui: ${registerResult.effects?.status.error}`,
            );
          }
          // Find the created blob object ID from objectChanges
          const createdBlobObjectChange = registerResult.objectChanges?.find(
            (oc) =>
              oc.type === "created" &&
              oc.objectType ===
                `0x2::object::Object<${GOLDFISH_PACKAGE_ID}::goldfish_backend::Blob>`, // Adjust type if needed
          );
          if (
            !createdBlobObjectChange ||
            !("objectId" in createdBlobObjectChange)
          ) {
            throw new Error(
              "Could not find created Blob object ID in registerBlobTransaction effects.",
            );
          }
          const walrusBlobObjectId = createdBlobObjectChange.objectId;
          console.error(
            `[Tool/${name}] Walrus Blob Object ID from Sui: ${walrusBlobObjectId}`,
          );

          // 3. Walrus: Write Encoded Blob to Nodes
          console.error(`[Tool/${name}] Writing encoded blob to nodes...`);
          const confirmations = await walrusClient.writeEncodedBlobToNodes({
            blobId: encoded.blobId,
            metadata: encoded.metadata,
            sliversByNode: encoded.sliversByNode,
            deletable: true,
            objectId: walrusBlobObjectId, // Use the objectId obtained from register tx
          });
          console.error(
            `[Tool/${name}] writeEncodedBlobToNodes confirmations: ${confirmations.length}`,
          );

          // 4. Walrus: Certify Blob Transaction (Sui Tx)
          console.error(`[Tool/${name}] Creating certifyBlobTransaction...`);
          const certifyTx = await walrusClient.certifyBlobTransaction({
            blobId: encoded.blobId,
            blobObjectId: walrusBlobObjectId, // Use the objectId
            confirmations,
            deletable: true,
          });
          console.error(`[Tool/${name}] Executing certifyBlobTransaction...`);
          const certifyResult = await executeSuiTransaction(certifyTx);
          console.error(
            `[Tool/${name}] certifyBlobTransaction digest: ${certifyResult.digest}`,
          );
          if (certifyResult.effects?.status.status !== "success") {
            throw new Error(
              `Failed to certify blob on Sui: ${certifyResult.effects?.status.error}`,
            );
          }

          // 5. Goldfish Contract: add_file_id (Sui Tx)
          console.error(`[Tool/${name}] Creating add_file_id transaction...`);
          const addFileIdTx = new Transaction();
          addFileIdTx.moveCall({
            target: `${GOLDFISH_PACKAGE_ID}::${FILE_REGISTRY_MODULE_NAME}::add_file_id`,
            arguments: [
              addFileIdTx.object(FILE_REGISTRY_OBJECT_ID),
              addFileIdTx.pure.string(encoded.blobId), // Assuming add_file_id takes string blob_id
            ],
          });
          console.error(`[Tool/${name}] Executing add_file_id transaction...`);
          const addFileIdResult = await executeSuiTransaction(addFileIdTx);
          console.error(
            `[Tool/${name}] add_file_id transaction digest: ${addFileIdResult.digest}`,
          );
          if (addFileIdResult.effects?.status.status !== "success") {
            throw new Error(
              `Failed to call add_file_id on Sui: ${addFileIdResult.effects?.status.error}`,
            );
          }

          console.error(
            `[Tool/${name}] Successfully uploaded ${filename} (Blob ID: ${encoded.blobId})`,
          );
          const finalMetadata = await walrusClient.getBlobMetadata({
            blobId: encoded.blobId,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    filename,
                    blob_id: encoded.blobId,
                    metadata: finalMetadata,
                    sui_registry_update_digest: addFileIdResult.digest,
                  },
                  null,
                  2,
                ),
              } as TextContent,
            ],
          };
        }
        // Add case for UPLOAD_FILES_TOOL if you implement its definition
        default:
          console.error(`[Tool Error] Unknown tool: ${name}`);
          return {
            content: [
              { type: "text", text: `Unknown tool: ${name}` } as TextContent,
            ],
            isError: true,
          };
      }
    } catch (error) {
      console.error(`[Tool/${name}] Error:`, error);
      return {
        content: [
          {
            type: "text",
            text: `Tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`,
          } as TextContent,
        ],
        isError: true,
      };
    }
  },
);

// --- Main Server Logic ---
async function main() {
  const walletAddressFromEnv = process.env.GOLDFISH_WALLET_ADDRESS;
  const privateKeyHexFromEnv = process.env.GOLDFISH_SERVER_PRIVATE_KEY_HEX;
  const walletAddressFromArg = process.argv[2];
  const privateKeyHexFromArg = process.argv[3]; // Assuming pk is the second arg

  const walletAddress = walletAddressFromEnv || walletAddressFromArg;
  const serverPkHex = privateKeyHexFromEnv || privateKeyHexFromArg;

  if (!walletAddress) {
    console.error(
      "Error: Goldfish wallet address not configured. Set GOLDFISH_WALLET_ADDRESS or pass as 1st cmd arg.",
    );
    process.exit(1);
  }
  if (!serverPkHex) {
    console.warn(
      "Warning: GOLDFISH_SERVER_PRIVATE_KEY_HEX not configured. Tools requiring Sui transactions will fail.",
    );
    // Not exiting, but tools will fail if they need to sign.
  } else {
    try {
      serverKeypair = Ed25519Keypair.fromSecretKey(
        Buffer.from(serverPkHex, "hex"),
      );
      if (serverKeypair.getPublicKey().toSuiAddress() !== walletAddress) {
        console.warn(
          `Warning: Configured server private key does not match GOLDFISH_WALLET_ADDRESS. Expected ${walletAddress}, got ${serverKeypair.getPublicKey().toSuiAddress()}. Sui transactions may fail or use the wrong sender.`,
        );
        // You might want to exit(1) here if this is a critical mismatch
      } else {
        console.error(
          `Server keypair loaded successfully for address: ${serverKeypair.getPublicKey().toSuiAddress()}`,
        );
      }
    } catch (e) {
      console.error(
        "Error loading server private key. Ensure it's a valid hex string.",
        e,
      );
      process.exit(1);
    }
  }

  config = { walletAddress, serverPrivateKeyHex: serverPkHex };
  console.error(
    `Goldfish MCP Server starting for wallet: ${config.walletAddress}`,
  );

  try {
    const blobType = await walrusClient.getBlobType();
    console.error("Successfully connected to Walrus, blob type:", blobType);
  } catch (e) {
    console.error("Failed to connect to Walrus on startup:", e);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Goldfish MCP Server running on stdio and connected.");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
