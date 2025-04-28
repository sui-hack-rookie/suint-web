"use client"

import { useRef, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import ForceGraph2D from "react-force-graph-2d"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

export default function GraphVisualization({ data }) {
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const { theme } = useTheme()
  const { toast } = useToast()
  const isMobile = useMobile()

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Adjust graph when data changes
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      // Center the graph
      graphRef.current.zoomToFit(400, 40)
    }
  }, [data])

  // Node click handler
  const handleNodeClick = (node) => {
    toast({
      title: `Node: ${node.name}`,
      description: `Type: ${node.type}, Status: ${node.status}`,
    })
  }

  // Get colors based on theme
  const getNodeColor = (node) => {
    const colorMap = {
      Person: theme === "dark" ? "#8b5cf6" : "#7c3aed",
      Organization: theme === "dark" ? "#ec4899" : "#db2777",
      Location: theme === "dark" ? "#10b981" : "#059669",
      Event: theme === "dark" ? "#f59e0b" : "#d97706",
      Resource: theme === "dark" ? "#3b82f6" : "#2563eb",
    }

    return colorMap[node.type] || "#888888"
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      {data.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="name"
          nodeColor={getNodeColor}
          nodeRelSize={isMobile ? 4 : 6}
          linkWidth={1}
          linkColor={() => (theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)")}
          onNodeClick={handleNodeClick}
          cooldownTime={3000}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading graph data...</p>
        </div>
      )}
    </div>
  )
}
