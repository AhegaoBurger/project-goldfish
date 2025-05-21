"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import {
  useSignAndExecuteTransaction,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import {
  GOLDFISH_PACKAGE_ID,
  FILE_REGISTRY_OBJECT_ID,
  FILE_REGISTRY_MODULE_NAME,
} from "@/constants";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";

type FileOptionsProps = {
  fileId: string;
  fileName: string;
  storageEpochs: number;
  isDeletable: boolean;
  fileData?: Uint8Array | null;
  onDelete?: () => void;
};

export default function FileOptions({
  fileId,
  fileName,
  // storageEpochs,
  isDeletable,
  fileData,
  onDelete,
}: FileOptionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const currentAccount = useCurrentAccount();

  const handleDownload = () => {
    if (!fileData) {
      toast.error("Download Failed", {
        description: "No file data available to download",
      });
      return;
    }

    setIsDownloading(true);
    try {
      // Detect file type from the first few bytes of the data
      const fileHeader = fileData.slice(0, 4);
      let mimeType = "application/octet-stream"; // default mime type
      let extension = "bin"; // default extension
      
      if (fileHeader.length >= 4) {
        // Check for common file signatures (magic numbers)
        if (fileHeader[0] === 0xFF && fileHeader[1] === 0xD8) {
          mimeType = "image/jpeg";
          extension = "jpg";
        } else if (
          fileHeader[0] === 0x89 && fileHeader[1] === 0x50 &&
          fileHeader[2] === 0x4E && fileHeader[3] === 0x47
        ) {
          mimeType = "image/png";
          extension = "png";
        } else if (fileHeader[0] === 0x47 && fileHeader[1] === 0x49 && fileHeader[2] === 0x46) {
          mimeType = "image/gif";
          extension = "gif";
        } else if (
          fileHeader[0] === 0x25 && fileHeader[1] === 0x50 &&
          fileHeader[2] === 0x44 && fileHeader[3] === 0x46
        ) {
          mimeType = "application/pdf";
          extension = "pdf";
        } else {
          // Try to detect if it's text by checking a larger sample
          try {
            const textSample = new TextDecoder().decode(fileData.slice(0, 100));
            // Only consider it text if it contains printable ASCII characters
            if (/^[\x20-\x7E\n\r\t]*$/.test(textSample)) {
              mimeType = "text/plain";
              extension = "txt";
            }
          } catch {
            // If decoding fails, it's likely binary data
            mimeType = "application/octet-stream";
            extension = "bin";
          }
        }
      }

      // Create a blob with the appropriate MIME type
      const blob = new Blob([fileData], { type: mimeType });

      // Create a temporary download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Use the detected extension
      const baseFileName = fileName.includes('.') 
        ? fileName.substring(0, fileName.lastIndexOf('.'))
        : fileName;
      a.download = `${baseFileName}.${extension}`;

      // Trigger the download
      document.body.appendChild(a);
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast("Download Started", {
        description: `Downloading ${a.download}`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // const handleShare = () => {
  //   console.log(`Sharing file: ${fileName} (${fileId})`);
  //   toast("Share Feature", {
  //     description: "Sharing functionality coming soon",
  //   });
  // };

  // const handleRename = () => {
  //   console.log(`Renaming file: ${fileName} (${fileId})`);
  //   toast("Rename Feature", {
  //     description: "Renaming functionality coming soon",
  //   });
  // };

  const handleDelete = async () => {
    if (!currentAccount) {
      toast.warning("Error", {
        description: "Please connect your wallet first",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Create transaction to remove file ID
      const tx = new Transaction();
      tx.moveCall({
        target: `${GOLDFISH_PACKAGE_ID}::${FILE_REGISTRY_MODULE_NAME}::remove_file_id`,
        arguments: [tx.object(FILE_REGISTRY_OBJECT_ID), tx.pure.string(fileId)],
      });

      // Execute the transaction
      const result = await signAndExecute({
        transaction: tx,
      });

      console.log("Delete transaction result:", result);

      // If provided, call the onDelete callback to refresh the file list
      if (onDelete) {
        onDelete();
      }

      toast("File Deleted", {
        description: `Successfully deleted ${fileName}`,
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Delete Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // const handleExtendStorage = () => {
  //   console.log(
  //     `Extending storage for file: ${fileName} (${fileId}) from ${storageEpochs} epochs`,
  //   );
  //   toast("Extend Storage Feature", {
  //     description: "Storage extension functionality coming soon",
  //   });
  // };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Options for {fileName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleDownload}
          disabled={isDownloading || !fileData}
        >
          {isDownloading ? "Downloading..." : "Download"}
        </DropdownMenuItem>
        {/* <DropdownMenuItem onClick={handleShare}>Share</DropdownMenuItem>
        <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExtendStorage}>
          Extend Storage
        </DropdownMenuItem> */}
        {isDeletable && (
          <DropdownMenuItem
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-600"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
