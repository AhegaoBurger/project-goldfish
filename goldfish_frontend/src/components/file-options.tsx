"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

type FileOptionsProps = {
  fileId: string;
  fileName: string;
  storageEpochs: number;
  isDeletable: boolean;
};

export default function FileOptions({
  fileId,
  fileName,
  storageEpochs,
  isDeletable,
}: FileOptionsProps) {
  const handleDownload = () => {
    console.log(`Downloading file: ${fileName} (${fileId})`);
    // Implement download functionality
  };

  const handleShare = () => {
    console.log(`Sharing file: ${fileName} (${fileId})`);
    // Implement share functionality
  };

  const handleRename = () => {
    console.log(`Renaming file: ${fileName} (${fileId})`);
    // Implement rename functionality
  };

  const handleDelete = () => {
    console.log(`Deleting file: ${fileName} (${fileId})`);
    // Implement delete functionality
  };

  const handleExtendStorage = () => {
    console.log(
      `Extending storage for file: ${fileName} (${fileId}) from ${storageEpochs} epochs`,
    );
    // Implement extend storage functionality
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Options for {fileName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload}>Download</DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>Share</DropdownMenuItem>
        <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onClick={handleExtendStorage}>
          Extend Storage
        </DropdownMenuItem>
        {isDeletable && (
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
