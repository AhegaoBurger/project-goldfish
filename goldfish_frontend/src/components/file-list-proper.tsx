// "use client";

// import { useState, useEffect, useMemo } from "react"; // Import useEffect, useMemo
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Input } from "@/components/ui/input";
// import {
//   File as FileIconDefault, // Renamed to avoid conflict
//   FileImage,
//   FileText,
//   FileVideo,
//   Loader2,
//   Music,
//   Search,
//   AlertCircle,
// } from "lucide-react";
// import FileOptions from "./file-options";

// // --- Imports for Sui interaction ---
// import {
//   useSuiClient,
//   useCurrentAccount,
//   // useSignAndExecuteTransaction, // Not needed for reading
// } from "@mysten/dapp-kit";
// import { WalrusClient } from "@mysten/walrus"; // Import WalrusClient if needed for future metadata fetching
// import {
//   GOLDFISH_PACKAGE_ID,
//   FILE_REGISTRY_OBJECT_ID,
//   FILE_REGISTRY_MODULE_NAME,
//   NETWORK,
// } from "../constants";
// // ---

// // Updated FileItem type to reflect reality (mostly ID known)
// type FileItem = {
//   id: string; // This is the blobId from the contract
//   name: string; // Will be simulated
//   type: string; // Will be simulated/guessed
//   size: string; // Will be simulated
//   lastModified: string; // Will be simulated
//   storageEpochs: number; // Will be simulated
//   isDeletable: boolean; // Will be simulated
// };

// export default function FileList() {
//   const [searchQuery, setSearchQuery] = useState("");
//   // State for fetched files, loading, and errors
//   const [fetchedFiles, setFetchedFiles] = useState<FileItem[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [fetchError, setFetchError] = useState<string | null>(null);

//   // Hooks for Sui interaction
//   const currentAccount = useCurrentAccount();
//   const suiClient = useSuiClient();

//   // --- WalrusClient Initialization (Optional for now, needed for metadata later) ---
//   // const walrusClient = useMemo(() => {
//   //   if (!suiClient) return null;
//   //   // Add WASM URL handling if/when needed
//   //   // import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url';
//   //   return new WalrusClient({
//   //     suiClient: suiClient,
//   //     network: NETWORK,
//   //     // wasmUrl: walrusWasmUrl,
//   //     storageNodeClientOptions: {
//   //         onError: (error) => console.error("Walrus Node Error:", error),
//   //     },
//   //   });
//   // }, [suiClient]);
//   // ---

//   // --- Fetching Logic ---
//   // useEffect(() => {
//   //   const fetchFileIds = async () => {
//   //     if (!currentAccount?.address || !suiClient) {
//   //       // ... (reset state logic) ...
//   //       return;
//   //     }

//   //     setIsLoading(true);
//   //     setFetchError(null);
//   //     setFetchedFiles([]);

//   //     try {
//   //       const targetFunction = `${GOLDFISH_PACKAGE_ID}::${FILE_REGISTRY_MODULE_NAME}::get_file_ids`;
//   //       const args = [
//   //         FILE_REGISTRY_OBJECT_ID, // Argument 0: ID of the FileRegistry shared object
//   //         currentAccount.address   // Argument 1: User's address
//   //       ];

//   //       console.log(`Calling view function: ${targetFunction}`);
//   //       console.log(`Arguments:`, args);

//   //       // Use sui_call for non-entry public functions
//   //       const viewResult = await suiClient.call('sui_call', {
//   //         package: GOLDFISH_PACKAGE_ID,
//   //         module: FILE_REGISTRY_MODULE_NAME,
//   //         function: 'get_file_ids',
//   //         typeArguments: [], // Your function doesn't have type parameters like <T>
//   //         arguments: args // Pass the arguments directly
//   //       });

//   //       // --- CRITICAL STEP: Inspect the actual result ---
//   //       console.log("Raw view function result (viewResult):", JSON.stringify(viewResult, null, 2));
//   //       // ---

//   //       // --- Process Result (NEEDS ADJUSTMENT BASED ON CONSOLE LOG) ---
//   //       // The structure here is a GUESS based on common patterns.
//   //       // You MUST adjust this based on the actual output logged above.
//   //       let blobIds: string[] = [];
//   //       // Common pattern 1: Look in results[0].mutableReferenceOutputType[1].values
//   //       // Common pattern 2: Look in results[0].returnValues[0][0] (BCS bytes needing decoding)
//   //       // Common pattern 3: Look directly in results if simpler

//   //       // Example GUESS based on potential structure:
//   //       if (viewResult && viewResult.results && viewResult.results.length > 0) {
//   //          // Adjust this path based on your console.log output!
//   //          const potentialDataPath = viewResult.results[0]?.mutableReferenceOutputType?.[1]?.values;
//   //          if (Array.isArray(potentialDataPath)) {
//   //              blobIds = potentialDataPath;
//   //          } else {
//   //              console.warn("Could not find expected array structure in view result. Check console log.");
//   //              // Maybe try parsing BCS if returnValues exists? (More complex)
//   //              // const returnValues = viewResult.results[0]?.returnValues;
//   //              // if (returnValues && returnValues[0]) {
//   //              //    // Need BCS schema and parsing logic here
//   //              // }
//   //          }
//   //       } else {
//   //            console.warn("View function call returned no results or unexpected structure.");
//   //       }

//   //       console.log("Parsed/Extracted blob IDs:", blobIds);

//   //       // --- Simulate Metadata (using extracted blobIds) ---
//   //       const simulatedFiles = blobIds.map((blobId, index) => ({
//   //         id: blobId,
//   //         name: `file_${blobId.substring(0, 8)}_${index}.dat`,
//   //         type: ["image", "document", "video", "audio", "other"][index % 5],
//   //         size: `${(Math.random() * 10 + 0.1).toFixed(1)} MB`,
//   //         lastModified: `Apr ${30 - index}, 2024`,
//   //         storageEpochs: (index % 3) + 1,
//   //         isDeletable: index % 2 === 0,
//   //       }));
//   //       setFetchedFiles(simulatedFiles);
//   //       // ---

//   //     } catch (error: any) {
//   //       console.error("Error fetching file IDs:", error);
//   //       setFetchError(`Failed to fetch file list: ${error.message || "Unknown error"}`);
//   //       setFetchedFiles([]);
//   //     } finally {
//   //       setIsLoading(false);
//   //     }
//   //   };

//   //   fetchFileIds();
//   // }, [currentAccount, suiClient]); // Dependencies

//   // --- Filtering Logic ---
//   const filteredFiles = fetchedFiles.filter((file) =>
//     file.name.toLowerCase().includes(searchQuery.toLowerCase()),
//   );

//   const getFileIcon = (type: string) => {
//     switch (type) {
//       case "image":
//         return <FileImage className="h-5 w-5 text-blue-500" />;
//       case "video":
//         return <FileVideo className="h-5 w-5 text-red-500" />;
//       case "audio":
//         return <Music className="h-5 w-5 text-purple-500" />;
//       case "document":
//       case "pdf":
//         return <FileText className="h-5 w-5 text-amber-500" />;
//       default:
//         return <FileIconDefault className="h-5 w-5 text-gray-500" />;
//     }
//   };

//   // --- Render Logic ---
//   const renderContent = () => {
//     if (!currentAccount) {
//       return (
//         <div className="p-8 text-center text-gray-500">
//           Please connect your wallet to view files.
//         </div>
//       );
//     }
//     if (isLoading) {
//       return (
//         <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-gray-500">
//           <Loader2 className="h-8 w-8 animate-spin" />
//           <span>Loading files...</span>
//         </div>
//       );
//     }
//     if (fetchError) {
//       return (
//         <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-red-600">
//           <AlertCircle className="h-8 w-8" />
//           <span>{fetchError}</span>
//           {/* Optional: Add a retry button */}
//         </div>
//       );
//     }
//     if (filteredFiles.length === 0 && searchQuery) {
//       return (
//         <div className="p-8 text-center text-gray-500">
//           No files match your search '{searchQuery}'.
//         </div>
//       );
//     }
//     if (fetchedFiles.length === 0 && !searchQuery) {
//       return (
//         <div className="p-8 text-center text-gray-500">
//           You haven't stored any files yet.
//         </div>
//       );
//     }

//     // --- Display File List ---
//     return (
//       <div className="rounded-md border">
//         {/* Header Row */}
//         <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 p-3 text-sm font-medium text-gray-500">
//           <div className="col-span-4">Name</div>
//           <div className="col-span-1">Size</div>
//           <div className="col-span-2">Last Modified</div>
//           <div className="col-span-2">Storage (Epochs)</div>
//           <div className="col-span-2">Deletable</div>
//           <div className="col-span-1"></div> {/* Options */}
//         </div>

//         {/* File Rows */}
//         <div className="divide-y">
//           {filteredFiles.map((file) => (
//             <div
//               key={file.id} // Use unique blobId as key
//               className="grid grid-cols-12 gap-2 p-3 text-sm items-center hover:bg-gray-50 transition-colors duration-150"
//             >
//               {/* Name */}
//               <div className="col-span-4 flex items-center gap-2">
//                 {getFileIcon(file.type)}
//                 <span className="font-medium truncate" title={file.name}>
//                   {file.name}
//                 </span>
//               </div>
//               {/* Size */}
//               <div className="col-span-1 text-gray-500">{file.size}</div>
//               {/* Last Modified */}
//               <div className="col-span-2 text-gray-500">
//                 {file.lastModified}
//               </div>
//               {/* Storage Epochs */}
//               <div className="col-span-2 flex items-center">
//                 <span
//                   className={`px-2 py-0.5 rounded-full text-xs font-medium ${
//                     file.storageEpochs > 2
//                       ? "bg-green-100 text-green-800"
//                       : file.storageEpochs > 1
//                         ? "bg-blue-100 text-blue-800"
//                         : "bg-amber-100 text-amber-800"
//                   }`}
//                 >
//                   {file.storageEpochs}{" "}
//                   {file.storageEpochs === 1 ? "Epoch" : "Epochs"}
//                 </span>
//               </div>
//               {/* Deletable */}
//               <div className="col-span-2">
//                 <span
//                   className={`px-2 py-0.5 rounded-full text-xs font-medium ${
//                     file.isDeletable
//                       ? "bg-green-100 text-green-800"
//                       : "bg-red-100 text-red-800"
//                   }`}
//                 >
//                   {file.isDeletable ? "Yes" : "No"}
//                 </span>
//               </div>
//               {/* Options */}
//               <div className="col-span-1 text-right">
//                 <FileOptions
//                   fileId={file.id}
//                   fileName={file.name}
//                   storageEpochs={file.storageEpochs}
//                   isDeletable={file.isDeletable}
//                   // Pass any other needed simulated props
//                 />
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   };

//   return (
//     <Card>
//       <CardHeader>
//         <div className="flex items-center justify-between">
//           <div>
//             <CardTitle>Your Files</CardTitle>
//             <CardDescription>Manage your stored files</CardDescription>
//           </div>
//           {/* Removed New Folder button for simplicity */}
//           {/* <Button className="bg-amber-500 hover:bg-amber-600">New Folder</Button> */}
//         </div>
//         <div className="relative mt-4">
//           {" "}
//           {/* Added margin top */}
//           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
//           <Input
//             placeholder="Search your files..."
//             className="pl-8"
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//             disabled={!currentAccount || isLoading} // Disable search while loading or not connected
//           />
//         </div>
//       </CardHeader>
//       <CardContent>
//         <Tabs defaultValue="all">
//           <TabsList className="mb-4">
//             <TabsTrigger value="all" disabled={!currentAccount || isLoading}>
//               All Files
//             </TabsTrigger>
//             {/* Disable other tabs for now */}
//             <TabsTrigger value="recent" disabled>
//               Recent
//             </TabsTrigger>
//             <TabsTrigger value="shared" disabled>
//               Shared
//             </TabsTrigger>
//             <TabsTrigger value="favorites" disabled>
//               Favorites
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value="all" className="m-0">
//             {renderContent()} {/* Render dynamic content */}
//           </TabsContent>

//           {/* Keep other TabsContent empty or add placeholders */}
//           {/* <TabsContent value="recent" className="m-0">...</TabsContent> */}
//           {/* <TabsContent value="shared" className="m-0">...</TabsContent> */}
//           {/* <TabsContent value="favorites" className="m-0">...</TabsContent> */}
//         </Tabs>
//       </CardContent>
//     </Card>
//   );
// }
