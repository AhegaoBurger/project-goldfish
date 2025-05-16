import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { WalrusClient } from "@mysten/walrus";
import { z } from "zod";

// Constants from frontend
const GOLDFISH_PACKAGE_ID = "0xd7da3d972c99d9318eb56df786b8b04e120a7769d572f537d920f40334388dd6";
const FILE_REGISTRY_OBJECT_ID = "0xa2b58dd03872c5bd0f337b13056eb50f9160848329efd9ad965f63e8aac1bc67";
const TABLE_OBJECT_ID = "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0";
const FILE_REGISTRY_MODULE_NAME = "goldfish_backend";
const NETWORK = "testnet";

// Initialize Sui and Walrus clients
const suiClient = new SuiClient({
  url: getFullnodeUrl(NETWORK),
});

const walrusClient = new WalrusClient({
  network: NETWORK,
  suiClient: suiClient, // Type cast to avoid version mismatch
  wasmUrl: "https://unpkg.com/@mysten/walrus-wasm@0.0.6/web/walrus_wasm_bg.wasm",
  storageNodeClientOptions: {
    timeout: 60_000,
    onError: (error) => console.error("Walrus Node Error:", error),
  },
});

// Create server instance
const server = new McpServer({
  name: "goldfish",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Get all files for owner
server.tool(
  "get_all_files",
  "Get information about all stored files for a specific owner",
  {
    owner_address: z.string().describe("The Sui address of the file owner"),
  },
  async ({ owner_address }: { owner_address: string }) => {
    try {
      // Get blob type to verify connection
      const blobType = await walrusClient.getBlobType();
      console.log("Blob type:", blobType);

      // Get storage confirmations from multiple nodes
      const MAX_NODES = 3;
      const files = [];

      for (let nodeIndex = 0; nodeIndex < MAX_NODES; nodeIndex++) {
        try {
          const confirmation = await walrusClient.getStorageConfirmationFromNode({
            nodeIndex,
            blobId: TABLE_OBJECT_ID,
            deletable: true,
            objectId: FILE_REGISTRY_OBJECT_ID,
          });

          if (confirmation) {
            const metadata = await walrusClient.getBlobMetadata({
              blobId: TABLE_OBJECT_ID,
            });
            files.push(metadata);
          }
        } catch (error) {
          console.warn(`Node ${nodeIndex} error:`, error);
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(files, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to get files: ${error}`,
        }],
      };
    }
  }
);

// Get specific file
server.tool(
  "get_file",
  "Get information about a specific file",
  {
    file_id: z.string().describe("The ID of the file to retrieve"),
    owner_address: z.string().describe("The Sui address of the file owner"),
  },
  async ({ file_id, owner_address }: { file_id: string; owner_address: string }) => {
    try {
      // Get blob metadata
      const metadata = await walrusClient.getBlobMetadata({
        blobId: file_id,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(metadata, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to get file: ${error}`,
        }],
      };
    }
  }
);

// Get blob content
server.tool(
  "get_blob_content",
  "Get the content of a specific blob",
  {
    blob_id: z.string().describe("The ID of the blob to retrieve"),
    owner_address: z.string().describe("The Sui address of the file owner"),
  },
  async ({ blob_id, owner_address }: { blob_id: string; owner_address: string }) => {
    try {
      // Get blob content
      const content = await walrusClient.readBlob({
        blobId: blob_id,
      });

      return {
        content: [{
          type: "text" as const,
          text: new TextDecoder().decode(content),
        }],
      };
    } catch (error) {
      if (error instanceof Error && error.name === "BlobNotCertifiedError") {
        return {
          content: [{
            type: "text" as const,
            text: "Blob is not certified yet. Please wait for certification.",
          }],
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: `Failed to get blob content: ${error}`,
        }],
      };
    }
  }
);

// Upload file
server.tool(
  "upload_file",
  "Upload a single file to Walrus storage",
  {
    filename: z.string().describe("Name of the file being uploaded"),
    content: z.string().describe("Base64 encoded content of the file"),
    owner_address: z.string().describe("The Sui address of the file owner"),
    storage_epochs: z.number().optional().describe("Number of epochs to store the file (default: 3)"),
  },
  async ({ filename, content, owner_address, storage_epochs = 3 }: { 
    filename: string;
    content: string;
    owner_address: string;
    storage_epochs?: number;
  }) => {
    try {
      const fileContent = new Uint8Array(Buffer.from(content, 'base64'));
      
      // Encode blob
      const encoded = await walrusClient.encodeBlob(fileContent);

      // Register blob transaction
      const registerBlobTransaction = await walrusClient.registerBlobTransaction({
        blobId: encoded.blobId,
        rootHash: encoded.rootHash,
        size: fileContent.length,
        deletable: true,
        epochs: storage_epochs,
        owner: owner_address,
      });

      // Write encoded blob to nodes
      const confirmations = await walrusClient.writeEncodedBlobToNodes({
        blobId: encoded.blobId,
        metadata: encoded.metadata,
        sliversByNode: encoded.sliversByNode,
        deletable: true,
        objectId: FILE_REGISTRY_OBJECT_ID,
      });

      // Certify blob
      const certifyBlobTransaction = await walrusClient.certifyBlobTransaction({
        blobId: encoded.blobId,
        blobObjectId: FILE_REGISTRY_OBJECT_ID,
        confirmations,
        deletable: true,
      });

      // Get blob metadata
      const metadata = await walrusClient.getBlobMetadata({
        blobId: encoded.blobId,
      });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            blob_id: encoded.blobId,
            metadata,
            register_tx: registerBlobTransaction,
            certify_tx: certifyBlobTransaction,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to upload file: ${error}`,
        }],
      };
    }
  }
);

// Upload multiple files
server.tool(
  "upload_files",
  "Upload multiple files to Walrus storage",
  {
    files: z.array(z.tuple([
      z.string().describe("Filename"),
      z.string().describe("Base64 encoded content"),
    ])).describe("List of tuples containing (filename, content) pairs"),
    owner_address: z.string().describe("The Sui address of the file owner"),
    storage_epochs: z.number().optional().describe("Number of epochs to store the files (default: 3)"),
  },
  async ({ files, owner_address, storage_epochs = 3 }: {
    files: [string, string][];
    owner_address: string;
    storage_epochs?: number;
  }) => {
    const results = [];
    
    for (const [filename, content] of files) {
      try {
        const fileContent = new Uint8Array(Buffer.from(content, 'base64'));
        
        // Encode blob
        const encoded = await walrusClient.encodeBlob(fileContent);

        // Register blob transaction
        const registerBlobTransaction = await walrusClient.registerBlobTransaction({
          blobId: encoded.blobId,
          rootHash: encoded.rootHash,
          size: fileContent.length,
          deletable: true,
          epochs: storage_epochs,
          owner: owner_address,
        });

        // Write encoded blob to nodes
        const confirmations = await walrusClient.writeEncodedBlobToNodes({
          blobId: encoded.blobId,
          metadata: encoded.metadata,
          sliversByNode: encoded.sliversByNode,
          deletable: true,
          objectId: FILE_REGISTRY_OBJECT_ID,
        });

        // Certify blob
        const certifyBlobTransaction = await walrusClient.certifyBlobTransaction({
          blobId: encoded.blobId,
          blobObjectId: FILE_REGISTRY_OBJECT_ID,
          confirmations,
          deletable: true,
        });

        // Get blob metadata
        const metadata = await walrusClient.getBlobMetadata({
          blobId: encoded.blobId,
        });

        results.push({
          success: true,
          filename,
          blob_id: encoded.blobId,
          metadata,
          register_tx: registerBlobTransaction,
          certify_tx: certifyBlobTransaction,
        });
      } catch (error) {
        results.push({
          success: false,
          filename,
          error: String(error),
        });
      }
    }

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

// Initialize and run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Goldfish MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 