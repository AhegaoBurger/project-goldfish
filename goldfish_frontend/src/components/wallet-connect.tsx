import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConnectButton } from "@mysten/dapp-kit";

export default function WalletConnect() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-amber-300 text-amber-700"
        >
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Wallet Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <img
            src="/placeholder.svg?height=20&width=20"
            alt="MetaMask"
            className="h-5 w-5"
          />
          MetaMask
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <img
            src="/placeholder.svg?height=20&width=20"
            alt="Coinbase"
            className="h-5 w-5"
          />
          Coinbase Wallet
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
          <img
            src="/placeholder.svg?height=20&width=20"
            alt="WalletConnect"
            className="h-5 w-5"
          />
          WalletConnect
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer">
          More options...
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
