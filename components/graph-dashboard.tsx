"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import NavBar from "@/components/nav-bar"
import GraphVisualization from "@/components/graph-visualization"
// import { generateGraphData } from "@/lib/graph-data" // Will be replaced by Sui data
import {
  fetchTransactionsForAddress,
  transformSuiTransactionsToGraphData,
  GraphData, // Assuming GraphData is exported from sui-adapter
} from "@/lib/sui-adapter"

// Define node types for filtering (can be adapted or expanded for Sui data)
const NODE_TYPES = ["root", "wallet", "contract", "object", "Person", "Organization", "Location", "Event", "Resource"]
const NODE_STATUSES = ["Active", "Inactive", "Pending", "Archived"] // May not be directly applicable to Sui nodes initially

export default function GraphDashboard() {
  const [suiAddress, setSuiAddress] = useState("")
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [isLoadingSuiData, setIsLoadingSuiData] = useState(false)
  const [suiError, setSuiError] = useState<string | null>(null)
  const [noTransactionsFound, setNoTransactionsFound] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filteredData, setFilteredData] = useState<GraphData>({ nodes: [], links: [] })

  // Removed initial data generation:
  // useEffect(() => {
  //   const data = generateGraphData(50, 100)
  //   setGraphData(data)
  //   setFilteredData(data)
  // }, [])

  // Apply search and filters to graph data
  useEffect(() => {
    // if (!graphData.nodes.length && !graphData.links.length) {
    //   setFilteredData({ nodes: [], links: [] });
    //   return;
    // }
    
    let newFilteredNodes = [...graphData.nodes];
    let newFilteredLinks = [...graphData.links];

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      newFilteredNodes = graphData.nodes.filter(
        (node) => node.name.toLowerCase().includes(lowerQuery) || node.type.toLowerCase().includes(lowerQuery) || node.id.toLowerCase().includes(lowerQuery),
      )
    }

    // Apply type/status filters
    if (activeFilters.length > 0) {
      newFilteredNodes = newFilteredNodes.filter(
        (node) => activeFilters.includes(node.type) // Simplified for now, status might not apply to Sui nodes directly
      )
    }
    
    // Only keep links between filtered nodes
    const nodeIds = new Set(newFilteredNodes.map((n) => n.id))
    newFilteredLinks = graphData.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target))

    setFilteredData({nodes: newFilteredNodes, links: newFilteredLinks});

  }, [searchQuery, activeFilters, graphData])

  // Toggle filter chips
  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  const handleFetchSuiGraphData = async () => {
    if (!suiAddress) {
      setSuiError("Please enter a Sui address.")
      return
    }
    setIsLoadingSuiData(true)
    setSuiError(null)
    setNoTransactionsFound(false) // Reset this state
    setGraphData({ nodes: [], links: [] }) // Clear previous graph

    try {
      const transactions = await fetchTransactionsForAddress(suiAddress)
      const newGraphData = await transformSuiTransactionsToGraphData(transactions, suiAddress)
      setGraphData(newGraphData)

      if (newGraphData.nodes.length === 1 && newGraphData.links.length === 0 && transactions.length === 0) {
        // Only root node present, and no actual transactions were fetched
        setNoTransactionsFound(true);
      }

    } catch (err) {
      console.error("Error in handleFetchSuiGraphData:", err)
      if (err instanceof SuiAdapterError) {
        switch (err.errorType) {
          case 'InvalidAddress':
            setSuiError("Invalid Sui address format. Please check and try again.");
            break;
          case 'NetworkError':
            setSuiError("A network error occurred. Please check your connection and try again.");
            break;
          case 'NoTransactions': // This case might not be thrown if empty array is preferred
             setNoTransactionsFound(true);
             setSuiError(null); // Not strictly an error, but a state
            break;
          default: // UnknownFetchError
            setSuiError("An unexpected error occurred while fetching data. Please try again.");
            break;
        }
      } else {
        setSuiError(err instanceof Error ? err.message : "An unknown error occurred.")
      }
      setGraphData({ nodes: [], links: [] }) // Clear graph on error
    } finally {
      setIsLoadingSuiData(false)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <NavBar />

      <div className="flex-1 p-4 overflow-hidden">
        <div className="mb-4 flex flex-col gap-4">
          {/* Sui Address Input and Fetch Button */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter Sui Address (e.g., 0x123...)"
              value={suiAddress}
              onChange={(e) => setSuiAddress(e.target.value)}
              className="flex-1"
              disabled={isLoadingSuiData}
            />
            <Button onClick={handleFetchSuiGraphData} disabled={isLoadingSuiData || !suiAddress}>
              {isLoadingSuiData ? "Loading..." : "Fetch Graph"}
            </Button>
          </div>
          {suiError && <p className="text-red-500 text-sm">{suiError}</p>}

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
              Clear Filters
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

        <div className="h-[calc(100vh-280px)] border rounded-lg overflow-hidden bg-background">
          {isLoadingSuiData && <p className="p-4 text-center">Loading Sui transaction data...</p>}
          
          {!isLoadingSuiData && suiError && (
            <p className="p-4 text-center text-red-500">{suiError}</p>
          )}

          {!isLoadingSuiData && !suiError && noTransactionsFound && (
            <p className="p-4 text-center text-muted-foreground">
              No transactions found for this address.
            </p>
          )}

          {!isLoadingSuiData && !suiError && !noTransactionsFound && graphData.nodes.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              Enter a Sui address above and click "Fetch Graph" to visualize its transactions.
            </p>
          )}

          {!isLoadingSuiData && !suiError && !noTransactionsFound && filteredData.nodes.length > 0 && (
            <GraphVisualization data={filteredData} />
          )}

          {/* Message for when filters result in no visible nodes from valid graph data */}
          {!isLoadingSuiData && !suiError && !noTransactionsFound && graphData.nodes.length > 0 && filteredData.nodes.length === 0 && (
             <p className="p-4 text-center text-muted-foreground">
              No nodes match your current search/filter criteria. Clear filters to see the full graph.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
