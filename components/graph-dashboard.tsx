"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation" // For App Router
import { 
  Search, FilterX, ArrowRightToLine, ArrowLeftFromLine, Repeat, Coins, 
  CalendarDays, Play, AlertTriangle, Info, Loader2 
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import NavBar from "@/components/nav-bar"
import GraphVisualization from "@/components/graph-visualization"
// import { generateGraphData } from "@/lib/graph-data" // Will be replaced by Sui data
import {
  fetchTransactionsForAddress,
  transformSuiTransactionsToGraphData,
  GraphData,
  SuiTransaction, // Import SuiTransaction type
  SuiAdapterError, // Import custom error
} from "@/lib/sui-adapter"
import { TransactionInfoCard } from "@/components/ui/transaction-info-card" // Import the new card
import { DatePicker } from "@/components/ui/date-picker" // Import DatePicker
import { subDays, startOfDay, endOfDay } from "date-fns" // For predefined ranges

// Define node types for filtering (can be adapted or expanded for Sui data)
const NODE_TYPES = ["root", "wallet", "contract", "object", "Person", "Organization", "Location", "Event", "Resource"]
const NODE_STATUSES = ["Active", "Inactive", "Pending", "Archived"] // May not be directly applicable to Sui nodes initially

export default function GraphDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [suiAddress, setSuiAddress] = useState("")
  // Ref to track if the initial URL address has been processed
  const initialUrlAddressProcessed = useRef(false); 
  // Ref to track the last address fetched to prevent re-fetching for the same address from URL
  const lastFetchedAddress = useRef<string | null>(null);

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [isLoadingSuiData, setIsLoadingSuiData] = useState(false)
  const [suiError, setSuiError] = useState<string | null>(null)
  const [noTransactionsFound, setNoTransactionsFound] = useState(false)
  const [rawSuiTransactions, setRawSuiTransactions] = useState<SuiTransaction[]>([])

  // State for TransactionInfoCard
  const [isInfoCardOpen, setIsInfoCardOpen] = useState(false)
  const [selectedEdgeTransactions, setSelectedEdgeTransactions] = useState<SuiTransaction[]>([])
  const [selectedEdgeSourceAddress, setSelectedEdgeSourceAddress] = useState<string | null>(null)
  const [selectedEdgeTargetAddress, setSelectedEdgeTargetAddress] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  
  // Filters for flow and amount
  type FlowFilterType = 'all' | 'in' | 'out' | 'internal';
  const [flowFilter, setFlowFilter] = useState<FlowFilterType>('all');
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [appliedMinAmount, setAppliedMinAmount] = useState<number | null>(null);
  const [appliedMaxAmount, setAppliedMaxAmount] = useState<number | null>(null);

  // State for Time Filter
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [appliedStartDate, setAppliedStartDate] = useState<Date | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<Date | null>(null);

  const [filteredData, setFilteredData] = useState<GraphData>({ nodes: [], links: [] })

  // Removed initial data generation:
  // useEffect(() => {
  //   const data = generateGraphData(50, 100)
  //   setGraphData(data)
  //   setFilteredData(data)
  // }, [])


  // Renamed original fetch function to be callable with a specific address
  const executeFetch = useCallback(async (addressToFetch: string) => {
    if (!addressToFetch) {
      setSuiError("Please enter a Sui address.");
      return;
    }
    // Prevent re-fetching if the address is the same as the last one successfully fetched via this mechanism
    if (lastFetchedAddress.current === addressToFetch && graphData.nodes.length > 0 && !suiError) {
        // console.log(`Skipping fetch for already processed address: ${addressToFetch}`);
        // If data is already loaded for this address, ensure UI reflects it (e.g. input field)
        if(suiAddress !== addressToFetch) setSuiAddress(addressToFetch);
        return;
    }

    setIsLoadingSuiData(true);
    setSuiError(null);
    setNoTransactionsFound(false);
    setGraphData({ nodes: [], links: [] });
    setRawSuiTransactions([]);
    
    // Update URL here if the fetch is for a new address from input
    // This check ensures we only push to router if the current state `suiAddress` initiated this,
    // not if `executeFetch` was called due to URL change.
    if (suiAddress === addressToFetch && searchParams.get('address') !== addressToFetch) {
      router.push(`/?address=${addressToFetch}`, { scroll: false });
    }

    try {
      const transactions = await fetchTransactionsForAddress(addressToFetch);
      setRawSuiTransactions(transactions);
      const newGraphData = await transformSuiTransactionsToGraphData(transactions, addressToFetch);
      setGraphData(newGraphData);
      lastFetchedAddress.current = addressToFetch; // Mark as fetched

      if (newGraphData.nodes.length === 1 && newGraphData.links.length === 0 && transactions.length === 0) {
        setNoTransactionsFound(true);
      }
    } catch (err) {
      console.error("Error in executeFetch:", err);
      lastFetchedAddress.current = null; // Clear last fetched on error
      if (err instanceof SuiAdapterError) {
        switch (err.errorType) {
          case 'InvalidAddress':
            setSuiError(`Invalid Sui address: ${addressToFetch}. Please check and try again.`);
            break;
          case 'NetworkError':
            setSuiError("A network error occurred. Please check your connection and try again.");
            break;
          default:
            setSuiError("An unexpected error occurred while fetching data. Please try again.");
            break;
        }
      } else {
        setSuiError(err instanceof Error ? err.message : "An unknown error occurred.");
      }
      setGraphData({ nodes: [], links: [] });
    } finally {
      setIsLoadingSuiData(false);
    }
  }, [router, searchParams, suiAddress, graphData.nodes.length, suiError]); // Added dependencies

  // Effect to handle address from URL query parameter
  useEffect(() => {
    const addressFromUrl = searchParams.get('address');
    if (addressFromUrl && /^0x[a-fA-F0-9]{64}$/.test(addressFromUrl)) {
      if (addressFromUrl !== suiAddress || !initialUrlAddressProcessed.current) {
        // console.log(`URL address detected: ${addressFromUrl}. Current suiAddress state: ${suiAddress}`);
        setSuiAddress(addressFromUrl); // Update input field
        if(addressFromUrl !== lastFetchedAddress.current || !graphData.nodes.length ) { // Fetch if different or no data
             // console.log(`Triggering fetch for URL address: ${addressFromUrl}`);
             executeFetch(addressFromUrl);
        }
        initialUrlAddressProcessed.current = true;
      }
    } else if (!addressFromUrl && initialUrlAddressProcessed.current) {
      // Handle scenario where address is removed from URL - clear graph?
      // For now, we only act if there's an address.
      // If you want to clear graph when address is removed:
      // setSuiAddress(""); 
      // setGraphData({ nodes: [], links: [] });
      // setRawSuiTransactions([]);
      // setSuiError(null);
      // setNoTransactionsFound(false);
      // lastFetchedAddress.current = null;
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only re-run if searchParams change


// Apply search and filters to graph data
useEffect(() => {
    let tempFilteredNodes = [...graphData.nodes];
    let tempFilteredLinks = [...graphData.links];
    const rootNode = graphData.nodes.find(node => node.type === 'root');

    // --- Transaction Map for Quick Lookup ---
    // Create a map of transactionId to timestamp for efficient filtering of links
    const transactionTimestampMap = new Map<string, Date>();
    rawSuiTransactions.forEach(tx => {
      if (tx.id) { // Ensure transactionId exists
        transactionTimestampMap.set(tx.id, tx.timestamp);
      }
    });

    // 1. Apply search query to nodes (pre-filtering)
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      tempFilteredNodes = tempFilteredNodes.filter(
        (node) => node.name.toLowerCase().includes(lowerQuery) || 
                   node.type.toLowerCase().includes(lowerQuery) || 
                   node.id.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Apply node type filters (pre-filtering)
    if (activeFilters.length > 0) {
      tempFilteredNodes = tempFilteredNodes.filter(
        (node) => activeFilters.includes(node.type)
      );
    }

    // 3. Apply Flow Filter to Links
    if (flowFilter !== 'all') {
      tempFilteredLinks = tempFilteredLinks.filter(link => link.flow === flowFilter);
    }

    // 4. Apply Amount Filter to Links
    if (appliedMinAmount !== null) {
      tempFilteredLinks = tempFilteredLinks.filter(link => (link.value || 0) >= appliedMinAmount);
    }
    if (appliedMaxAmount !== null) {
      tempFilteredLinks = tempFilteredLinks.filter(link => (link.value || 0) <= appliedMaxAmount);
    }

    // 5. Apply Time Filter to Links
    // Ensure appliedStartDate and appliedEndDate are handled correctly (start/end of day)
    let finalAppliedStartDate = appliedStartDate ? startOfDay(appliedStartDate) : null;
    let finalAppliedEndDate = appliedEndDate ? endOfDay(appliedEndDate) : null;

    if (finalAppliedStartDate || finalAppliedEndDate) {
      tempFilteredLinks = tempFilteredLinks.filter(link => {
        if (!link.transactionId) return false; // Link must have a transactionId
        const txTimestamp = transactionTimestampMap.get(link.transactionId);
        if (!txTimestamp) return false; // Transaction not found in raw data (should not happen if data is consistent)

        const isAfterStartDate = finalAppliedStartDate ? txTimestamp >= finalAppliedStartDate : true;
        const isBeforeEndDate = finalAppliedEndDate ? txTimestamp <= finalAppliedEndDate : true;
        return isAfterStartDate && isBeforeEndDate;
      });
    }
    
    // 6. Determine nodes to display based on filtered links
    const activeLinkNodeIds = new Set<string>();
    tempFilteredLinks.forEach(link => {
      if (typeof link.source === 'string') activeLinkNodeIds.add(link.source);
      else activeLinkNodeIds.add((link.source as {id: string}).id); 
      if (typeof link.target === 'string') activeLinkNodeIds.add(link.target);
      else activeLinkNodeIds.add((link.target as {id: string}).id); 
    });

    // Ensure root node is always included if it was in the original graphData
    if (rootNode) {
      activeLinkNodeIds.add(rootNode.id);
    }
    
    // Final node list: nodes that passed text/type filters AND are part of active links (or is the root node)
    const finalFilteredNodes = tempFilteredNodes.filter(node => activeLinkNodeIds.has(node.id));
    
    // Ensure links only connect nodes that are in the finalFilteredNodes list
    const finalNodeIds = new Set(finalFilteredNodes.map(n => n.id));
    const finalFilteredLinks = tempFilteredLinks.filter(link => {
         const sourceId = typeof link.source === 'string' ? link.source : (link.source as {id: string}).id;
         const targetId = typeof link.target === 'string' ? link.target : (link.target as {id: string}).id;
         return finalNodeIds.has(sourceId) && finalNodeIds.has(targetId);
    });


    setFilteredData({ nodes: finalFilteredNodes, links: finalFilteredLinks });

  }, [searchQuery, activeFilters, graphData, flowFilter, appliedMinAmount, appliedMaxAmount, appliedStartDate, appliedEndDate, rawSuiTransactions]);


  const handleApplyAmountFilter = () => {
    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    setAppliedMinAmount(isNaN(min) ? null : min);
    setAppliedMaxAmount(isNaN(max) ? null : max);
  };

  const handleClearAmountFilter = () => {
    setMinAmount("");
    setMaxAmount("");
    setAppliedMinAmount(null);
    setAppliedMaxAmount(null);
  };

  const handleApplyTimeFilter = () => {
    setAppliedStartDate(startDate ? startDate : null);
    setAppliedEndDate(endDate ? endDate : null);
  };

  const handleClearTimeFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setAppliedStartDate(null);
    setAppliedEndDate(null);
  };

  const setPredefinedDateRange = (days: number) => {
    const today = new Date();
    setEndDate(endOfDay(today)); // Set end date to end of today
    setStartDate(startOfDay(subDays(today, days -1))); // Set start date to start of N days ago
    // Automatically apply for predefined ranges for immediate feedback
    setAppliedStartDate(startOfDay(subDays(today, days -1)));
    setAppliedEndDate(endOfDay(today));
  };

  // Toggle filter chips
  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  // This is the function called by the "Fetch Graph" button
  const handleManualFetch = () => {
    // Basic client-side check before attempting to update URL and fetch
    if (!suiAddress || !/^0x[a-fA-F0-9]{64}$/.test(suiAddress)) {
      setSuiError("Please enter a valid Sui address (0x... with 64 hex characters).");
      return;
    }
    // Update URL if the address in input is different from URL or not in URL
    if (suiAddress !== searchParams.get('address')) {
      router.push(`/?address=${suiAddress}`, { scroll: false });
      // The useEffect on searchParams will then trigger executeFetch if addressFromUrl actually changes
      // and is different from lastFetchedAddress or if no data.
      // However, to ensure fetch happens immediately for manual input even if URL was same as old state:
      if (suiAddress === lastFetchedAddress.current && suiAddress === searchParams.get('address')) {
         // If user clicks fetch for the *exact same* address already displayed and in URL,
         // and they might want to re-fetch (e.g. error state), allow it.
         // The executeFetch has its own lastFetchedAddress check, this is more for URL sync.
         lastFetchedAddress.current = null; // Force re-fetch by clearing this
      }
    }
    // Directly call executeFetch with the current suiAddress from input state
    // The executeFetch function itself will handle the lastFetchedAddress check.
    executeFetch(suiAddress);
  };

  const handleEdgeClickForInfo = (link: any) => {
    if (!link || !link.source || !link.target) return;

    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    const relatedTransactions = rawSuiTransactions.filter(tx => 
      (tx.sender === sourceId && tx.recipients.includes(targetId)) ||
      (tx.sender === targetId && tx.recipients.includes(sourceId))
    );

    setSelectedEdgeTransactions(relatedTransactions);
    setSelectedEdgeSourceAddress(sourceId);
    setSelectedEdgeTargetAddress(targetId);
    setIsInfoCardOpen(true);
  };

  return (
    <div className="flex flex-col h-screen">
      <NavBar />

      <div className="flex-1 p-4 overflow-hidden relative"> {/* Added relative for potential absolute positioning inside */}
        <div className="mb-4 flex flex-col gap-4">
          {/* Sui Address Input and Fetch Button */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter Sui Address (e.g., 0x123...)"
              value={suiAddress} // Input field always shows current suiAddress state
              onChange={(e) => {
                setSuiAddress(e.target.value);
                if (suiError) setSuiError(null); 
                if (noTransactionsFound) setNoTransactionsFound(null);
              }}
              className="flex-1"
              disabled={isLoadingSuiData}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualFetch(); }}
            />
            <Button onClick={handleManualFetch} disabled={isLoadingSuiData || !suiAddress}>
              {isLoadingSuiData ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Fetch Graph</>
              )}
            </Button>
          </div>
          {suiError && (
            <p className="text-red-500 text-sm flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" /> {suiError}
            </p>
          )}

          {/* Existing Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search nodes by name, type, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                disabled={isLoadingSuiData} // Disable search while loading new data
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setActiveFilters([])
              }}
              disabled={isLoadingSuiData}
            >
              <FilterX className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium py-1">Filter by type:</span>
            {NODE_TYPES.map((type) => (
              <Badge
                key={type}
                variant={activeFilters.includes(type) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleFilter(type)}
              >
                {type}
              </Badge>
            ))}
          </div>

          {/* Flow and Amount Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center">
                 Transaction Flow
              </label>
              <div className="flex gap-2 flex-wrap">
                <Button
                    key="all"
                    variant={flowFilter === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFlowFilter('all')}
                    disabled={isLoadingSuiData}
                  >
                    All Flows
                </Button>
                <Button
                    key="in"
                    variant={flowFilter === 'in' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFlowFilter('in')}
                    disabled={isLoadingSuiData}
                  >
                    <ArrowRightToLine className="mr-1.5 h-3 w-3" /> Inflow
                </Button>
                <Button
                    key="out"
                    variant={flowFilter === 'out' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFlowFilter('out')}
                    disabled={isLoadingSuiData}
                  >
                    <ArrowLeftFromLine className="mr-1.5 h-3 w-3" /> Outflow
                </Button>
                <Button
                    key="internal"
                    variant={flowFilter === 'internal' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFlowFilter('internal')}
                    disabled={isLoadingSuiData}
                  >
                    <Repeat className="mr-1.5 h-3 w-3" /> Internal
                  </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center">
                <Coins className="mr-1.5 h-4 w-4 text-muted-foreground" /> Transaction Amount (MIST)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  min="0"
                  className="flex-1"
                  disabled={isLoadingSuiData}
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  min="0"
                  className="flex-1"
                  disabled={isLoadingSuiData}
                />
              </div>
              <div className="mt-2 flex gap-2">
                 <Button size="sm" onClick={handleApplyAmountFilter} disabled={isLoadingSuiData}>Apply Amount</Button>
                 <Button size="sm" variant="outline" onClick={handleClearAmountFilter} disabled={isLoadingSuiData}>Clear Amount</Button>
              </div>
            </div>
          </div>

          {/* Time Filter Section */}
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center">
              <CalendarDays className="mr-1.5 h-4 w-4 text-muted-foreground" /> Filter by Date Range
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <DatePicker date={startDate} setDate={setStartDate} placeholder="Start date" disabled={isLoadingSuiData} />
              <DatePicker date={endDate} setDate={setEndDate} placeholder="End date" disabled={isLoadingSuiData} />
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={() => setPredefinedDateRange(1)} disabled={isLoadingSuiData}>Last 24h</Button>
              <Button size="sm" variant="outline" onClick={() => setPredefinedDateRange(7)} disabled={isLoadingSuiData}>Last 7 Days</Button>
              <Button size="sm" variant="outline" onClick={() => setPredefinedDateRange(30)} disabled={isLoadingSuiData}>Last 30 Days</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApplyTimeFilter} disabled={isLoadingSuiData}>Apply Dates</Button>
              <Button size="sm" variant="outline" onClick={handleClearTimeFilter} disabled={isLoadingSuiData}>Clear Dates</Button>
            </div>
          </div>

          {/* Status filter might be less relevant for Sui nodes initially, can be hidden or adapted */}
          {/* <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium py-1">Filter by status:</span>
            {NODE_STATUSES.map((status) => (
              <Badge
                key={status}
                variant={activeFilters.includes(status) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleFilter(status)}
              >
                {status}
              </Badge>
            ))}
          </div> */}
        </div>

        <div className="h-[calc(100vh-320px)] border rounded-lg overflow-hidden bg-background"> {/* Adjusted height for new filters */}
          {isLoadingSuiData && (
            <p className="p-4 text-center flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Sui transaction data...
            </p>
          )}
          
          {!isLoadingSuiData && suiError && (
            <p className="p-4 text-center text-red-500 flex items-center justify-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> {suiError}
            </p>
          )}

          {!isLoadingSuiData && !suiError && noTransactionsFound && (
            <p className="p-4 text-center text-muted-foreground flex items-center justify-center">
              <Info className="mr-2 h-5 w-5" /> No transactions found for this address.
            </p>
          )}

          {!isLoadingSuiData && !suiError && !noTransactionsFound && graphData.nodes.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              Enter a Sui address above and click "Fetch Graph" to visualize its transactions. 
            </p>
          )}

          {!isLoadingSuiData && !suiError && !noTransactionsFound && filteredData.nodes.length > 0 && (
            <GraphVisualization data={filteredData} onEdgeClick={handleEdgeClickForInfo} />
          )}

          {/* Message for when filters result in no visible nodes from valid graph data */}
          {!isLoadingSuiData && !suiError && !noTransactionsFound && graphData.nodes.length > 0 && filteredData.nodes.length === 0 && (
             <p className="p-4 text-center text-muted-foreground">
              No nodes match your current search/filter criteria. Clear filters to see the full graph.
            </p>
          )}
        </div>
        
        <TransactionInfoCard
          isOpen={isInfoCardOpen}
          onClose={() => setIsInfoCardOpen(false)}
          transactions={selectedEdgeTransactions}
          sourceAddress={selectedEdgeSourceAddress || ""}
          targetAddress={selectedEdgeTargetAddress || ""}
        />
      </div>
    </div>
  )
}
