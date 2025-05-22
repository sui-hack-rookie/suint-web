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
  Fingerprint, CheckCircle2, XCircle, CalendarClock, Coins, UserRound, ArrowRightLeft, X,
  Copy as CopyIcon
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface TransactionInfoCardProps {
  isOpen: boolean
  onClose: () => void
  transactions: SuiTransaction[]
  sourceAddress: string
  targetAddress: string
}

const SUI_EXPLORER_TX_URL = "https://suiscan.xyz/mainnet/tx/"

export function TransactionInfoCard({
  isOpen,
  onClose,
  transactions,
  sourceAddress,
  targetAddress,
}: TransactionInfoCardProps) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully.`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: `Could not copy ${label} to clipboard.`,
        variant: "destructive",
      });
      console.error('Failed to copy: ', err);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[90vw] sm:w-[600px] md:w-[700px] lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>Transaction Details</SheetTitle>
          <SheetDescription>
            Displaying transactions between <span className="font-mono">{sourceAddress.toString()}</span> and <span className="font-mono">{targetAddress.toString()}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-6 -mr-6 min-h-0">
          <div className="space-y-4">
            {transactions.length > 0 ? (
              transactions.map((tx, index) => (
                <div key={tx.id || index} className="p-3 rounded-md border bg-muted/20">
                  <div className="flex justify-between items-center mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <strong className="text-sm" title={tx.id}>
                        Tx ID:{" "}
                        <Link href={`${SUI_EXPLORER_TX_URL}${tx.id}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary break-all">
                          {tx.id}
                        </Link>
                      </strong>
                      <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => copyToClipboard(tx.id, "Transaction ID")}>
                        <CopyIcon className="h-3 w-3" />
                        <span className="sr-only">Copy Transaction ID</span>
                      </Button>
                    </div>
                    <Badge variant={tx.status === "success" ? "default" : "destructive"} className="text-xs flex-shrink-0">
                      {tx.status === "success" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {tx.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center">
                      <CalendarClock className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      Timestamp: {new Date(tx.timestamp).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 min-w-0">
                      <UserRound className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      Sender: <span className="font-mono ml-1 break-all" title={tx.sender}>{tx.sender}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => copyToClipboard(tx.sender, "Sender Address")}>
                        <CopyIcon className="h-3 w-3" />
                        <span className="sr-only">Copy Sender Address</span>
                      </Button>
                    </div>
                    {tx.recipients.length > 0 && (
                       <div className="flex items-start">
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5 mt-0.5 shrink-0 flex-shrink-0" />
                        Recipients:
                        <div className="ml-1 flex flex-col space-y-0.5 min-w-0">
                          {tx.recipients.map(r => (
                            <div key={r} className="flex items-center gap-1">
                              <span className="font-mono break-all" title={r}>{r}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={() => copyToClipboard(r, "Recipient Address")}>
                                <CopyIcon className="h-3 w-3" />
                                <span className="sr-only">Copy Recipient Address</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="flex items-center">
                      <Coins className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      Amount: <span className="font-mono ml-1">{tx.amount} MIST</span>
                    </p>
                    {tx.gasUsed !== undefined && (
                       <p className="flex items-center">
                        <Fingerprint className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                        Gas Used: <span className="font-mono ml-1">{tx.gasUsed}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="p-3 text-center text-muted-foreground">No specific transactions found for this direct link.</p>
            )}
          </div>
        </ScrollArea>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
