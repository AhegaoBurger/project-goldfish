from typing import List, Dict, Optional
from pathlib import Path
import uuid
from mcp.server.fastmcp import FastMCP
from sui_sdk import SuiClient
from walrus_sdk import WalrusClient
import asyncio

# Initialize FastMCP server
mcp = FastMCP("goldfish")

# Constants from frontend
GOLDFISH_PACKAGE_ID = "0xd7da3d972c99d9318eb56df786b8b04e120a7769d572f537d920f40334388dd6"
FILE_REGISTRY_OBJECT_ID = "0xa2b58dd03872c5bd0f337b13056eb50f9160848329efd9ad965f63e8aac1bc67"
TABLE_OBJECT_ID = "0x9801afde129050adb0573fadfd798fa9733104d4521bb8936991e59a2ad706f0"
FILE_REGISTRY_MODULE_NAME = "goldfish_backend"
NETWORK = "testnet"

# Initialize Sui and Walrus clients
sui_client = SuiClient(NETWORK)
walrus_client = WalrusClient(sui_client, NETWORK)

# Storage configuration
STORAGE_DIR = Path("storage")
STORAGE_DIR.mkdir(exist_ok=True)

# In-memory storage for demo (replace with proper database in production)
files_db: Dict[str, dict] = {}
blobs_db: Dict[str, str] = {}

@mcp.tool()
async def get_all_files(owner_address: str) -> List[dict]:
    """Get information about all stored files for a specific owner
    
    Args:
        owner_address: The Sui address of the file owner
    """
    try:
        # Get all files from the table object for the owner
        files = await walrus_client.get_files_for_owner(
            table_id=TABLE_OBJECT_ID,
            owner_address=owner_address
        )
        return [
            {
                "file_id": file.id,
                "filename": file.name,
                "size": file.size,
                "storage_epochs": file.storage_epochs,
                "is_deletable": file.is_deletable,
                "last_modified": file.last_modified.isoformat()
            }
            for file in files
        ]
    except Exception as e:
        raise ValueError(f"Failed to get files: {str(e)}")

@mcp.tool()
async def get_file(file_id: str, owner_address: str) -> dict:
    """Get information about a specific file
    
    Args:
        file_id: The ID of the file to retrieve
        owner_address: The Sui address of the file owner
    """
    try:
        file = await walrus_client.get_file(
            file_id=file_id,
            owner_address=owner_address
        )
        return {
            "file_id": file.id,
            "filename": file.name,
            "size": file.size,
            "storage_epochs": file.storage_epochs,
            "is_deletable": file.is_deletable,
            "last_modified": file.last_modified.isoformat()
        }
    except Exception as e:
        raise ValueError(f"Failed to get file: {str(e)}")

@mcp.tool()
async def get_all_blob_ids() -> List[str]:
    """Get all blob IDs in the system"""
    return list(blobs_db.keys())

@mcp.tool()
async def get_blob_id(blob_id: str) -> str:
    """Get information about a specific blob
    
    Args:
        blob_id: The ID of the blob to retrieve
    """
    if blob_id not in blobs_db:
        raise ValueError("Blob not found")
    return blobs_db[blob_id]

@mcp.tool()
async def get_blob_content(blob_id: str, owner_address: str) -> bytes:
    """Get the content of a specific blob
    
    Args:
        blob_id: The ID of the blob to retrieve
        owner_address: The Sui address of the file owner
    """
    try:
        return await walrus_client.get_blob_content(
            blob_id=blob_id,
            owner_address=owner_address
        )
    except Exception as e:
        raise ValueError(f"Failed to get blob content: {str(e)}")

@mcp.tool()
async def upload_file(filename: str, content: bytes, owner_address: str, storage_epochs: int = 3) -> dict:
    """Upload a single file to Walrus storage
    
    Args:
        filename: Name of the file being uploaded
        content: Binary content of the file
        owner_address: The Sui address of the file owner
        storage_epochs: Number of epochs to store the file (default: 3)
    """
    try:
        # Encode the blob
        encoded = await walrus_client.encode_blob(content)
        
        # Register the blob on the blockchain
        blob_object = await walrus_client.register_blob(
            blob_id=encoded.blob_id,
            root_hash=encoded.root_hash,
            size=len(content),
            deletable=True,
            epochs=storage_epochs,
            owner=owner_address
        )
        
        # Upload the encoded blob to storage nodes
        await walrus_client.write_encoded_blob(
            blob_id=encoded.blob_id,
            metadata=encoded.metadata,
            slivers_by_node=encoded.slivers_by_node,
            deletable=True,
            object_id=blob_object.id
        )
        
        # Certify the blob
        file_info = await walrus_client.certify_blob(
            blob_id=encoded.blob_id,
            blob_object_id=blob_object.id,
            filename=filename,
            owner_address=owner_address
        )
        
        return {
            "file_id": file_info.id,
            "filename": file_info.name,
            "size": file_info.size,
            "storage_epochs": file_info.storage_epochs,
            "is_deletable": file_info.is_deletable,
            "blob_id": encoded.blob_id
        }
    except Exception as e:
        raise ValueError(f"Failed to upload file: {str(e)}")

@mcp.tool()
async def upload_files(files: List[tuple[str, bytes]], owner_address: str, storage_epochs: int = 3) -> List[dict]:
    """Upload multiple files to Walrus storage
    
    Args:
        files: List of tuples containing (filename, content) pairs
        owner_address: The Sui address of the file owner
        storage_epochs: Number of epochs to store the files (default: 3)
    """
    results = []
    for filename, content in files:
        result = await upload_file(filename, content, owner_address, storage_epochs)
        results.append(result)
    return results

if __name__ == "__main__":
    mcp.run(transport='stdio') 