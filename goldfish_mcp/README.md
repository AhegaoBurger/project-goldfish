# Goldfish MCP Server

A Model Context Protocol (MCP) server for the Goldfish decentralized storage
application. This server provides tools for interacting with the Walrus storage
system on the Sui blockchain.

## Features

- File upload and download operations
- Blob management
- Integration with Sui blockchain
- Walrus storage interaction
- MCP-compliant tools

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Access to Sui testnet
- Walrus storage node access

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd goldfish_mcp_ts
```

2. Install dependencies:

```bash
npm install
```

## Configuration

The server uses the following configuration constants:

- `GOLDFISH_PACKAGE_ID`: The Sui package ID for Goldfish
- `FILE_REGISTRY_OBJECT_ID`: The object ID for the file registry
- `TABLE_OBJECT_ID`: The object ID for the storage table
- `NETWORK`: The Sui network to connect to (default: testnet)

## Available Tools

### Read Operations

1. `get_all_files`
   - Gets information about all stored files for a specific owner
   - Parameters:
     - `owner_address`: The Sui address of the file owner

2. `get_file`
   - Gets information about a specific file
   - Parameters:
     - `file_id`: The ID of the file to retrieve
     - `owner_address`: The Sui address of the file owner

3. `get_blob_content`
   - Gets the content of a specific blob
   - Parameters:
     - `blob_id`: The ID of the blob to retrieve
     - `owner_address`: The Sui address of the file owner

### Write Operations

1. `upload_file`
   - Uploads a single file to Walrus storage
   - Parameters:
     - `filename`: Name of the file being uploaded
     - `content`: Base64 encoded content of the file
     - `owner_address`: The Sui address of the file owner
     - `storage_epochs`: Number of epochs to store the file (optional,
       default: 3)

2. `upload_files`
   - Uploads multiple files to Walrus storage
   - Parameters:
     - `files`: List of tuples containing (filename, content) pairs
     - `owner_address`: The Sui address of the file owner
     - `storage_epochs`: Number of epochs to store the files (optional,
       default: 3)

## Development

1. Build the project:

```bash
npm run build
```

2. Run in development mode:

```bash
npm run dev
```

## Integration with Claude for Desktop

1. Open your Claude for Desktop configuration file:
   - MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%AppData%\Claude\claude_desktop_config.json`

2. Add the server configuration:

```json
{
    "mcpServers": {
        "goldfish": {
            "command": "node",
            "args": [
                "--loader",
                "ts-node/esm",
                "/ABSOLUTE/PATH/TO/goldfish_mcp_ts/src/server.ts"
            ]
        }
    }
}
```

3. Restart Claude for Desktop

## Error Handling

The server implements comprehensive error handling for:

- Network issues
- Invalid file operations
- Blockchain interaction failures
- Storage node problems

All errors are properly formatted and returned through the MCP protocol.

## License

[Add your license information here]
