"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import NavBar from "@/components/nav-bar"
import GraphVisualization from "@/components/graph-visualization"
import { generateGraphData } from "@/lib/graph-data"

// Define node types for filtering
const NODE_TYPES = ["Person", "Organization", "Location", "Event", "Resource"]
const NODE_STATUSES = ["Active", "Inactive", "Pending", "Archived"]

export default function GraphDashboard() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filteredData, setFilteredData] = useState({ nodes: [], links: [] })

  // Generate graph data on component mount
  useEffect(() => {
    const data = generateGraphData(50, 100)
    setGraphData(data)
    setFilteredData(data)
  }, [])

  // Apply search and filters to graph data
  useEffect(() => {
    if (!graphData.nodes.length) return

    const filtered = { ...graphData }

    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      filtered.nodes = graphData.nodes.filter(
        (node) => node.name.toLowerCase().includes(lowerQuery) || node.type.toLowerCase().includes(lowerQuery),
      )

      // Only keep links between filtered nodes
      const nodeIds = new Set(filtered.nodes.map((n) => n.id))
      filtered.links = graphData.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target))
    }

    // Apply type/status filters
    if (activeFilters.length > 0) {
      filtered.nodes = filtered.nodes.filter(
        (node) => activeFilters.includes(node.type) || activeFilters.includes(node.status),
      )

      // Only keep links between filtered nodes
      const nodeIds = new Set(filtered.nodes.map((n) => n.id))
      filtered.links = filtered.links.filter((link) => nodeIds.has(link.source) && nodeIds.has(link.target))
    }

    setFilteredData(filtered)
  }, [searchQuery, activeFilters, graphData])

  // Toggle filter chips
  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  return (
    <div className="flex flex-col h-screen">
      <NavBar />

      <div className="flex-1 p-4 overflow-hidden">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setActiveFilters([])
              }}
            >
              Clear
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

          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        <div className="h-[calc(100vh-220px)] border rounded-lg overflow-hidden bg-background">
          <GraphVisualization data={filteredData} />
        </div>
      </div>
    </div>
  )
}
