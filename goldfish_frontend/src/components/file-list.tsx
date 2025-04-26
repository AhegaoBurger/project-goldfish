"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { File, FileImage, FileText, FileVideo, MoreVertical, Music, Search } from "lucide-react"

type FileItem = {
  id: string
  name: string
  type: string
  size: string
  lastModified: string
}

export default function FileList() {
  const [searchQuery, setSearchQuery] = useState("")

  // Sample file data
  const files: FileItem[] = [
    {
      id: "1",
      name: "project-proposal.pdf",
      type: "pdf",
      size: "2.4 MB",
      lastModified: "Today, 2:30 PM",
    },
    {
      id: "2",
      name: "company-logo.png",
      type: "image",
      size: "840 KB",
      lastModified: "Yesterday, 10:15 AM",
    },
    {
      id: "3",
      name: "quarterly-report.xlsx",
      type: "spreadsheet",
      size: "1.2 MB",
      lastModified: "Apr 20, 2023",
    },
    {
      id: "4",
      name: "product-demo.mp4",
      type: "video",
      size: "24.8 MB",
      lastModified: "Apr 18, 2023",
    },
    {
      id: "5",
      name: "meeting-notes.docx",
      type: "document",
      size: "320 KB",
      lastModified: "Apr 15, 2023",
    },
    {
      id: "6",
      name: "presentation.pptx",
      type: "presentation",
      size: "5.7 MB",
      lastModified: "Apr 10, 2023",
    },
    {
      id: "7",
      name: "background-music.mp3",
      type: "audio",
      size: "3.2 MB",
      lastModified: "Apr 5, 2023",
    },
  ]

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <FileImage className="h-5 w-5 text-blue-500" />
      case "video":
        return <FileVideo className="h-5 w-5 text-red-500" />
      case "audio":
        return <Music className="h-5 w-5 text-purple-500" />
      case "document":
      case "pdf":
        return <FileText className="h-5 w-5 text-amber-500" />
      default:
        return <File className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Files</CardTitle>
            <CardDescription>Manage your stored files</CardDescription>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-600">New Folder</Button>
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
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-2 border-b bg-gray-50 p-3 text-sm font-medium text-gray-500">
                <div className="col-span-6">Name</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-3">Last Modified</div>
                <div className="col-span-1"></div>
              </div>

              {filteredFiles.length > 0 ? (
                <div className="divide-y">
                  {filteredFiles.map((file) => (
                    <div key={file.id} className="grid grid-cols-12 gap-2 p-3 text-sm items-center">
                      <div className="col-span-6 flex items-center gap-2">
                        {getFileIcon(file.type)}
                        <span className="font-medium truncate">{file.name}</span>
                      </div>
                      <div className="col-span-2 text-gray-500">{file.size}</div>
                      <div className="col-span-3 text-gray-500">{file.lastModified}</div>
                      <div className="col-span-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Download</DropdownMenuItem>
                            <DropdownMenuItem>Share</DropdownMenuItem>
                            <DropdownMenuItem>Rename</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No files found</p>
                </div>
              )}
            </div>
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
  )
}
