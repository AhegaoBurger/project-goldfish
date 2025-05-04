"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function StorageInfo() {
  // This would come from your blockchain connection
  const storageData = {
    totalEpochs: 10,
    usedEpochs: 6,
    currentEpoch: 3,
    epochDuration: "7 days",
  };

  const percentUsed = (storageData.usedEpochs / storageData.totalEpochs) * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-md">Blockchain Storage</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Files are stored on the blockchain for a specific number of
                    epochs. One epoch is {storageData.epochDuration}. Current
                    epoch: {storageData.currentEpoch}.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            <span>Buy Storage</span>
          </Button>
        </div>
        <CardDescription>
          {storageData.usedEpochs} of {storageData.totalEpochs} epochs used
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <Progress value={percentUsed} className="h-2" />
      </CardContent>
      <CardFooter className="pt-1">
        <p className="text-xs text-muted-foreground">
          Current epoch: {storageData.currentEpoch} | Epoch duration:{" "}
          {storageData.epochDuration}
        </p>
      </CardFooter>
    </Card>
  );
}
