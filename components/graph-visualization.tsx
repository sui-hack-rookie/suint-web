"use client"

import { useRef, useEffect, useState } from "react"
import { useTheme } from "next-themes"
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation"; // Import useRouter
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

// Dynamically import ForceGraph2D with SSR disabled
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface GraphVisualizationProps {
  data: {
    nodes: any[]; // Consider defining a more specific Node type if shared across components
    links: any[]; // Consider defining a more specific Link type
  };
  onEdgeClick?: (link: any) => void; // Callback for edge clicks
}

export default function GraphVisualization({ data, onEdgeClick }: GraphVisualizationProps) {
  const graphRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const { theme } = useTheme()
  const { toast } = useToast()
  const isMobile = useMobile()
  const router = useRouter(); // Initialize useRouter

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

  // Adjust graph focus and identify root node when data changes
  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      const currentRootNode = data.nodes.find(node => node.type === 'root');
      if (currentRootNode && currentRootNode.id !== rootNodeId) {
        // New root address detected (e.g., new fetch)
        setRootNodeId(currentRootNode.id);
        // Delay focusing to allow initial layout simulation
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.centerAt(currentRootNode.x || 0, currentRootNode.y || 0, 750);
            graphRef.current.zoom(2.0, 750); // Slightly less zoom for broader initial view
          }
        }, 500);
      } else if (data.nodes.length > 0) {
        // Data changed (e.g., due to filtering), re-fit the view
        graphRef.current.zoomToFit(600, 100); // Adjust duration and padding
      }
    } else if (data.nodes.length === 0 && graphRef.current) {
       // Handle case where all nodes are filtered out - perhaps reset zoom?
       // For now, do nothing, it will show an empty canvas.
    }
  }, [data, rootNodeId]); // Add rootNodeId to dependencies

  // Apply D3 forces once graph is initialized
  useEffect(() => {
    if (graphRef.current) { // No need to wait for rootNodeId specifically for these
      graphRef.current.d3Force('charge').strength(-150); // Slightly more repulsion
      // The link distance can be dynamic based on root, or general.
      // If rootNodeId is available, use it, otherwise a default.
      const currentRootId = data.nodes.find(n => n.type === 'root')?.id;
      graphRef.current.d3Force('link').distance(link => 
        (currentRootId && (link.source.id === currentRootId || link.target.id === currentRootId)) ? 120 : 70
      );
    }
  }, [data]); // Re-apply if data changes, as links might change

  // Node click handler
  const handleNodeClick = (node: any) => { // Added type for node
    toast({
      title: `Node: ${node.id}`, 
      description: `Type: ${node.type}, Address: ${node.address || node.id}, Name: ${node.name}`,
    });

    // Check if the clicked node is not the current root node
    if (node.id && node.id !== rootNodeId) {
      // console.log(`Node clicked: ${node.id}, current root: ${rootNodeId}. Navigating...`);
      router.push(`/?address=${node.id}`, { scroll: false });
    } else {
      // console.log(`Node clicked: ${node.id}, is current root or invalid. No navigation.`);
    }
  }

  // Link click handler
  const handleLinkClick = (link: any) => {
    // Call the callback passed from the parent component (GraphDashboard)
    if (onEdgeClick) {
      onEdgeClick(link);
    }

    // Keep the existing toast for immediate feedback (optional, could be removed)
    const sourceNode = link.source;
    const targetNode = link.target;
    toast({
      title: `Link Clicked: ${link.transactionId?.substring(0, 10)}...`, // Modified title for clarity
      description: `Details for transactions between ${sourceNode?.id?.substring(0,6)}... and ${targetNode?.id?.substring(0,6)}... will be shown.`,
    });
  }

  // Get colors based on theme for Sui-specific types
  const getNodeColor = (node) => {
    let color = theme === "dark" ? "#9ca3af" : "#6b7280"; // Default gray
    const typeColorMap = {
      root: theme === "dark" ? "#fde047" : "#facc15", // Yellow
      wallet: theme === "dark" ? "#60a5fa" : "#3b82f6", // Blue
      contract: theme === "dark" ? "#4ade80" : "#22c55e", // Green
      Person: theme === "dark" ? "#8b5cf6" : "#7c3aed",
      Organization: theme === "dark" ? "#ec4899" : "#db2777",
      Location: theme === "dark" ? "#10b981" : "#059669",
      Event: theme === "dark" ? "#f59e0b" : "#d97706",
      Resource: theme === "dark" ? "#3b82f6" : "#2563eb",
    };
    if (node.type && typeColorMap[node.type]) color = typeColorMap[node.type];
    return color;
  }

  // Helper function for contrasting text color
  const getContrastingTextColor = (hexColor) => {
    if (!hexColor) return '#FFFFFF';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // Custom node rendering function
  const nodeCanvasObject = (node, ctx, globalScale) => {
    const size = (isMobile ? 2 : 3) * (node.val || 1);
    const nodeColor = getNodeColor(node); // Get color for the node
    
    // Draw the circle
    ctx.fillStyle = nodeColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fill();

    // Draw the address preview text
    const label = node.address ? `${node.address.substring(0, 6)}...` : `${node.id.substring(0, 6)}...`;
    // Adjust font size dynamically: smaller when zoomed out, larger when zoomed in, but capped
    const baseFontSize = Math.max(1.5, Math.min(size / 2.8, 6)); // Base size related to node size
    const fontSize = baseFontSize / globalScale * 1.5; // Scale with zoom, with a multiplier for readability
    
    // Cap font size to prevent it from becoming too large or too small
    const effectiveFontSize = Math.max(1.5, Math.min(fontSize, size * 0.8));


    if (effectiveFontSize > 2) { // Only draw if font size is reasonably large
        ctx.font = `${effectiveFontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = getContrastingTextColor(nodeColor);
        ctx.fillText(label, node.x, node.y);
    }
  };


  return (
    <div ref={containerRef} className="w-full h-full">
      {typeof window !== 'undefined' && data.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => `${node.name} (${node.type})`} // Keep for hover details
          // nodeColor={getNodeColor} // Removed as nodeCanvasObject handles coloring
          nodeRelSize={isMobile ? 2 : 3} // Base size, actual size determined by node.val in nodeCanvasObject
          nodeCanvasObject={nodeCanvasObject}
          linkWidth={(link: any) => Math.max(0.5, Math.min(2.5, (link.value || 0) / 500000))}
          linkColor={() => (theme === "dark" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)")}
          linkLabel={(link: any) => `Type: ${link.transactionType}, Value: ${link.value}`}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleColor={() => theme === "dark" ? "rgba(200, 200, 200, 0.6)" : "rgba(50, 50, 50, 0.6)"}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          cooldownTime={8000}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.25}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">
            {data.nodes.length === 0 ? "No data to display. Fetch graph data or adjust filters." : "Initializing graph..."}
          </p>
        </div>
      )}
    </div>
  )
}
