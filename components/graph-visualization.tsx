"use client"

import { useRef, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import dynamic from 'next/dynamic';
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

// Dynamically import ForceGraph2D with SSR disabled
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

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

  const [rootNodeId, setRootNodeId] = useState<string | null>(null);

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

  // Adjust graph focus and identify root node when data changes
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      const rootNode = data.nodes.find(node => node.type === 'root');
      if (rootNode) {
        setRootNodeId(rootNode.id); // Store root node ID for force adjustments
        // Delay focusing to allow initial layout simulation
        setTimeout(() => {
          if (graphRef.current) { // Check ref again as it might have unmounted
            graphRef.current.centerAt(rootNode.x || 0, rootNode.y || 0, 750); // Center on root
            graphRef.current.zoom(2.5, 750); // Zoom in
          }
        }, 500);
      } else {
        // Fallback if no root node, though unlikely with current adapter logic
        graphRef.current.zoomToFit(400, 100); // Wider padding
      }
    }
  }, [data]);

  // Apply D3 forces once graph is initialized and rootNodeId is known
  useEffect(() => {
    if (graphRef.current && rootNodeId) {
      graphRef.current.d3Force('charge').strength(-120); // Increase repulsion
      graphRef.current.d3Force('link').distance(link => 
        (link.source.id === rootNodeId || link.target.id === rootNodeId) ? 100 : 60 // Longer links for root
      );
      // Optional: Reheat simulation if needed after force changes, though often not necessary
      // graphRef.current.d3ReheatSimulation(); 
    }
  }, [rootNodeId]); // Rerun when rootNodeId is set

  // Node click handler
  const handleNodeClick = (node) => {
    toast({
      title: `Node: ${node.id}`, 
      description: `Type: ${node.type}, Address: ${node.address || node.id}, Name: ${node.name}`, // Added Name
    })
  }

  // Link click handler
  const handleLinkClick = (link) => {
    // Access source and target node data from the link object
    const sourceNode = link.source;
    const targetNode = link.target;
    toast({
      title: `Transaction: ${link.transactionId?.substring(0, 10)}...`, // Shortened ID
      description: `Type: ${link.transactionType}, Value: ${link.value}\nFrom: ${sourceNode?.id?.substring(0,6)}... To: ${targetNode?.id?.substring(0,6)}...`,
    })
  }

  // Get colors based on theme for Sui-specific types
  const getNodeColor = (node) => {
    // Default color
    let color = theme === "dark" ? "#9ca3af" : "#6b7280"; // Default gray

    const typeColorMap = {
      root: theme === "dark" ? "#fde047" : "#facc15", // Yellow
      wallet: theme === "dark" ? "#60a5fa" : "#3b82f6", // Blue
      contract: theme === "dark" ? "#4ade80" : "#22c55e", // Green
      // Add other Sui-specific types if they emerge
      // Generic types from previous version (can be kept or removed)
      Person: theme === "dark" ? "#8b5cf6" : "#7c3aed", // Purple
      Organization: theme === "dark" ? "#ec4899" : "#db2777", // Pink
      Location: theme === "dark" ? "#10b981" : "#059669", // Teal
      Event: theme === "dark" ? "#f59e0b" : "#d97706", // Amber
      Resource: theme === "dark" ? "#3b82f6" : "#2563eb", // Indigo
    };

    if (node.type && typeColorMap[node.type]) {
      color = typeColorMap[node.type];
    }
    
    return color;
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      {typeof window !== 'undefined' && data.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => `${node.name} (${node.type})`} // More informative node label
          nodeColor={getNodeColor}
          nodeRelSize={isMobile ? 2 : 3} // Adjusted base node size
          linkWidth={(link: any) => Math.max(0.5, Math.min(2.5, (link.value || 0) / 500000))} // Dynamic link width (MIST based)
          linkColor={() => (theme === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)")} // Slightly more subtle links
          linkLabel={(link: any) => `Type: ${link.transactionType}, Value: ${link.value}`} // Simplified link label
          linkDirectionalParticles={2} // Show 2 particles per link
          linkDirectionalParticleWidth={1.5} // Particle size
          linkDirectionalParticleColor={() => theme === "dark" ? "rgba(200, 200, 200, 0.6)" : "rgba(50, 50, 50, 0.6)"}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          cooldownTime={8000} // Increased cooldown time
          d3AlphaDecay={0.02} // Standard alpha decay
          d3VelocityDecay={0.25} // Adjusted velocity decay
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            {data.nodes.length === 0 ? "No data to display. Fetch graph data or adjust filters." : "Loading graph data..."}
          </p>
        </div>
      )}
    </div>
  )
}
