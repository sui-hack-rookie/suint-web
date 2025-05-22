"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SuiTransaction } from "@/lib/sui-adapter"
import { 
  Fingerprint, CheckCircle2, XCircle, CalendarClock, Coins, UserRound, ArrowRightLeft, X
} from "lucide-react"

interface TransactionInfoCardProps {
  isOpen: boolean
  onClose: () => void
  transactions: SuiTransaction[]
  sourceAddress: string
  targetAddress: string
}

const SUI_EXPLORER_TX_URL = "https://suiscan.xyz/mainnet/tx/"

// Helper to shorten addresses for display
const shortenAddress = (address: string, startChars = 6, endChars = 4) => {
  if (!address) return "N/A"
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`
}

export function TransactionInfoCard({
  isOpen,
  onClose,
  transactions,
  sourceAddress,
  targetAddress,
}: TransactionInfoCardProps) {
  if (!isOpen) {
    return null
  }

  const formatTimestamp = (timestamp: Date) => {
    return `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center">
            <ArrowRightLeft className="mr-2 h-5 w-5 text-muted-foreground" />
            Transactions: {shortenAddress(sourceAddress)} &harr; {shortenAddress(targetAddress)}
          </SheetTitle>
          <SheetDescription>
            Displaying {transactions.length} transaction(s) between these two addresses.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-grow p-6">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center">No direct transactions found for this specific interaction link.</p>
          ) : (
            <ul className="space-y-4">
              {transactions.map((tx) => (
                <li key={tx.id} className="border p-4 rounded-md shadow-sm bg-card hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <a
                      href={`${SUI_EXPLORER_TX_URL}${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline truncate flex items-center"
                      title={tx.id}
                    >
                      <Fingerprint className="mr-1.5 h-4 w-4 flex-shrink-0" /> ID: {shortenAddress(tx.id, 8, 8)}
                    </a>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center ${
                        tx.status === "success" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {tx.status === "success" 
                        ? <CheckCircle2 className="mr-1 h-3 w-3" /> 
                        : <XCircle className="mr-1 h-3 w-3" />
                      }
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center"><CalendarClock className="mr-1.5 h-4 w-4 text-muted-foreground" /><strong>Timestamp:</strong>&nbsp;{formatTimestamp(tx.timestamp)}</p>
                    <p className="flex items-center"><Coins className="mr-1.5 h-4 w-4 text-muted-foreground" /><strong>Amount:</strong>&nbsp;{tx.amount} MIST</p>
                    <p className="flex items-center">
                      <UserRound className="mr-1.5 h-4 w-4 text-muted-foreground" /><strong>From:</strong>&nbsp;<span title={tx.sender}>{shortenAddress(tx.sender)}</span>
                    </p>
                    <p className="flex items-center">
                      <UserRound className="mr-1.5 h-4 w-4 text-muted-foreground" /><strong>To:</strong>&nbsp;<span title={tx.recipients.join(', ')}>{tx.recipients.map(r => shortenAddress(r)).join(', ')}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        
        <SheetFooter className="p-6 border-t">
          <SheetClose asChild>
            <Button variant="outline" onClick={onClose}><X className="mr-2 h-4 w-4" /> Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
