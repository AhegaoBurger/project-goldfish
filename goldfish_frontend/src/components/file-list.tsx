"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  File,
  FileImage,
  FileText,
  FileVideo,
  Music,
  Search,
  FileJson,
  FileSpreadsheet,
  FileArchive,
  FileCode,
} from "lucide-react";
import FileOptions from "./file-options";
import { TABLE_OBJECT_ID } from "../constants";
import { useUserFileContents, BlobFetchResult } from "../hooks/useUserFilesIds";
import { formatFileSize, processBlobResult } from "../lib/fileHelpers";
import { walrusClient } from "@/hooks/useWalrus";

// Define the file item type for our processed files
interface FileItem {
  id: string; // The blob ID
  objectId: string; // The blob object ID if available
  name: string;
  extension: string;
  type: string;
  size: string;
  lastModified: string;
  storageEpochs: number;
  isDeletable: boolean;
  data: Uint8Array | null;
  error?: string;
}

export default function FileList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [processedFiles, setProcessedFiles] = useState<FileItem[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const { userFileGroups, isLoading, error, refetch } = useUserFileContents({
    parentId: TABLE_OBJECT_ID,
  });

  // Get file icon based on file type
  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <FileImage className="h-5 w-5 text-blue-500" />;
      case "video":
        return <FileVideo className="h-5 w-5 text-red-500" />;
      case "audio":
        return <Music className="h-5 w-5 text-purple-500" />;
      case "pdf":
        return <FileText className="h-5 w-5 text-amber-500" />;
      case "document":
        return <FileText className="h-5 w-5 text-amber-500" />;
      case "json":
        return <FileJson className="h-5 w-5 text-green-500" />;
      case "spreadsheet":
        return <FileSpreadsheet className="h-5 w-5 text-green-700" />;
      case "archive":
        return <FileArchive className="h-5 w-5 text-gray-700" />;
      case "code":
        return <FileCode className="h-5 w-5 text-indigo-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  // Process the file groups into usable file items
  useEffect(() => {
    const processFiles = async () => {
      if (!walrusClient || !userFileGroups.length) {
        setProcessedFiles([]);
        return;
      }

      setIsLoadingMetadata(true);

      try {
        // Flatten all the file groups into a single array of blob results
        const allBlobResults: BlobFetchResult[] = userFileGroups.flatMap(
          (group) => group,
        );

        // Process each blob to get its metadata and attributes
        const processedFileItems = await Promise.all(
          allBlobResults.map((blobResult) => processBlobResult(blobResult, walrusClient))
        );

        setProcessedFiles(processedFileItems);
      } catch (err) {
        console.error("Error processing files:", err);
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    processFiles();
  }, [userFileGroups, walrusClient]);

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    return processedFiles.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [processedFiles, searchQuery]);

  if (isLoading) return <p>Loading your files...</p>;
  if (error)
    return (
      <p>
        Error: {error} <button onClick={refetch}>Retry</button>
      </p>
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Files</CardTitle>
            <CardDescription>Manage your stored files</CardDescription>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600">
            New Folder
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search files..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Files</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="shared">Shared</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="m-0">
            {isLoadingMetadata ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Loading file information...</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 p-3 text-sm font-medium text-gray-500">
                  <div className="col-span-4">Name</div>
                  <div className="col-span-1">Size</div>
                  <div className="col-span-2">Last Modified</div>
                  <div className="col-span-2">Storage (Epochs)</div>
                  <div className="col-span-2">Deletable</div>
                  <div className="col-span-1"></div>
                </div>

                {filteredFiles.length > 0 ? (
                  <div className="divide-y">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`grid grid-cols-12 gap-2 p-3 text-sm items-center ${file.error ? "bg-red-50" : ""}`}
                      >
                        <div className="col-span-4 flex items-center gap-2">
                          {getFileIcon(file.type)}
                          <span className="font-medium truncate">
                            {file.name}
                          </span>
                        </div>
                        <div className="col-span-1 text-gray-500">
                          {file.size}
                        </div>
                        <div className="col-span-2 text-gray-500">
                          {file.lastModified}
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              file.storageEpochs > 2
                                ? "bg-green-100 text-green-800"
                                : file.storageEpochs > 1
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {file.storageEpochs}{" "}
                            {file.storageEpochs === 1 ? "Epoch" : "Epochs"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              file.isDeletable
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {file.isDeletable ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="col-span-1 text-right">
                          <FileOptions
                            fileId={file.id}
                            fileName={file.name}
                            storageEpochs={file.storageEpochs}
                            isDeletable={file.isDeletable}
                            fileData={file.data}
                            onDelete={refetch}
                          />
                        </div>
                        {file.error && (
                          <div className="col-span-12 text-red-600 text-xs mt-1">
                            Error: {file.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No files found</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="m-0">
            <div className="p-8 text-center">
              <p className="text-gray-500">Recent files will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="shared" className="m-0">
            <div className="p-8 text-center">
              <p className="text-gray-500">Shared files will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="m-0">
            <div className="p-8 text-center">
              <p className="text-gray-500">Favorite files will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
