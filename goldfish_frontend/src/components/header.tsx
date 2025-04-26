import { Button } from "@/components/ui/button"
import { Fish } from "lucide-react"
import WalletConnect from "./wallet-connect"

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fish className="h-8 w-8 text-amber-500" />
            <span className="text-xl font-bold text-amber-600">Goldfish</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
            <Button variant="ghost" size="sm">
              Activity
            </Button>
            <Button variant="ghost" size="sm">
              Settings
            </Button>
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  )
}
