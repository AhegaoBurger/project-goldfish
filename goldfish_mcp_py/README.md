# Goldfish Model Context Protocol Server

Model Context Protocol (MCP) server for the Goldfish decentralized file storage
system, using Walrus storage on the Sui blockchain.

## Setup

1. Install `uv` (if not already installed):

```bash
# MacOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

2. Create and set up the environment:

```bash
# Create a new directory for our project
uv init goldfish_mcp
cd goldfish_mcp

# Create virtual environment and activate it
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv pip install -e .
```

## Running the Server

Start the server with:

```bash
python server.py
```

The server will run using stdio transport, which allows it to be used with Model
Context Protocol clients like Claude for Desktop.

## Available Tools

### Read Operations

- `get_all_files` - Get information about all stored files for a specific owner
- `get_file` - Get information about a specific file by ID
- `get_blob_content` - Get the content of a specific blob

### Write Operations

- `upload_file` - Upload a single file to Walrus storage
- `upload_files` - Upload multiple files to Walrus storage

## Storage

Files are stored using the Walrus storage system on the Sui blockchain network.
Each file is:

1. Encoded into blobs
2. Registered on the blockchain
3. Uploaded to Walrus storage nodes
4. Certified on the blockchain

The server uses the following configuration:

- Network: Testnet
- Package ID:
  `0xd7da3d972c99d9318eb56df786b8b04e120a7769d572f537d920f40334388dd6`
- File Registry Object ID:
  `0xa2b58dd03872c5bd0f337b13056eb50f9160848329efd9ad965f63e8aac1bc67`
- Table Object ID:
  `0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0`

## Development

For development work:

```bash
uv pip install -e ".[dev]"
```

## Production Considerations

1. Implement proper error handling and retries for blockchain operations
2. Add authentication and authorization
3. Consider implementing file chunking for large files
4. Add monitoring and logging for blockchain operations
