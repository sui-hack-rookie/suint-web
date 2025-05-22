"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useTheme } from "next-themes"
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation"; // Import useRouter
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { isMobile } from 'react-device-detect';
import { LocateFixed } from "lucide-react"; // Import the icon
import { Button } from "@/components/ui/button"

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
  const graphRef = useRef<any>(null); 
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const { theme } = useTheme()
  const { toast } = useToast()
  const isMobileHook = useMobile(); // Renamed to avoid conflict with 'isMobile' from react-device-detect
  const router = useRouter(); 

  const [lockedNodes, setLockedNodes] = useState<Set<string | number>>(new Set());
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [isGraphReady, setIsGraphReady] = useState(false);
  const [initialCenteringDone, setInitialCenteringDone] = useState(false); // New state

  // Effect to set isGraphReady when the graph instance is available
  useEffect(() => {
    if (graphRef.current) {
      setIsGraphReady(true);
    }
  }, [graphRef.current]); // Rerun if graphRef.current changes (e.g., on mount)

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

  // Effect to manage rootNodeId state and reset centering flag on data change
  useEffect(() => {
    const currentRootNode = data.nodes.find(node => node.type === 'root');
    const newRootId = currentRootNode ? currentRootNode.id : null;
    if (newRootId !== rootNodeId) { 
      setRootNodeId(newRootId);
    }
    setInitialCenteringDone(false); // Reset for new data, so onEngineStop will re-center.
  }, [data]); // Removed rootNodeId from deps to avoid potential issues if it was set by this effect

  // Effect for D3 forces
  useEffect(() => {
    if (!isGraphReady || !graphRef.current) {
      return; 
    }
    graphRef.current.d3Force('charge').strength(-150);
    graphRef.current.d3Force('link').distance((link: any) =>
      (rootNodeId && (link.source.id === rootNodeId || link.target.id === rootNodeId)) ? 120 : 70
    );
  }, [data, isGraphReady, rootNodeId]); // data is still relevant if structure changes, rootNodeId for link distance

  const handleEngineStop = useCallback(() => {
    if (graphRef.current && !initialCenteringDone) {
      const rootNodeInstance = rootNodeId ? data.nodes.find(n => n.id === rootNodeId) : null;

      if (rootNodeInstance && rootNodeInstance.x != null && rootNodeInstance.y != null) {
        graphRef.current.centerAt(rootNodeInstance.x, rootNodeInstance.y, 750);
        graphRef.current.zoom(2.0, 750);
      } else if (rootNodeInstance) { // Fallback for root node if x,y not ready (less likely in onEngineStop)
        graphRef.current.zoomToFit(400, 150, (n: any) => n.id === rootNodeInstance.id);
      } else if (data.nodes.length > 0) {
        graphRef.current.zoomToFit(600, 100); // Fit all nodes if no specific root
      }
      setInitialCenteringDone(true);
    }
  }, [initialCenteringDone, data.nodes, rootNodeId, isGraphReady]); // isGraphReady ensures graphRef.current is likely set

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
  }

  const handleNodeDragEnd = useCallback((node: any) => {
    // Lock the node at its new position
    node.fx = node.x;
    node.fy = node.y;
    if (!lockedNodes.has(node.id)) {
      setLockedNodes(prevLockedNodes => {
        const newSet = new Set(prevLockedNodes);
        newSet.add(node.id);
        return newSet;
      });
    }
  }, [lockedNodes]); // Dependency: lockedNodes state

  const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => {
    event.preventDefault(); // Prevent browser context menu
    if (lockedNodes.has(node.id)) {
      // Unlock the node
      node.fx = null;
      node.fy = null;
      setLockedNodes(prevLockedNodes => {
        const newSet = new Set(prevLockedNodes);
        newSet.delete(node.id);
        return newSet;
      });
    }
  }, [lockedNodes]); // Dependency: lockedNodes state

  // Get colors based on theme for Sui-specific types
  const getNodeColor = (node) => {
    // Updated "kawaii" and visible color palette
    let color = theme === "dark" ? "#E0E0E0" : "#777777"; // Default: Light Gray (dark) / Medium Gray (light)

    const typeColorMap = {
      // Dark Theme: Softer pastels & bright accents
      // Light Theme: Vibrant & cheerful colors
      root: theme === "dark" ? "#FFACEC" : "#FF69B4",       // Pastel Pink (dark) / Hot Pink (light)
      wallet: theme === "dark" ? "#A7F3D0" : "#40E0D0",     // Pastel Mint (dark) / Turquoise (light)
      contract: theme === "dark" ? "#B1E1FF" : "#6495ED",   // Pastel Blue (dark) / Cornflower Blue (light)
      Person: theme === "dark" ? "#FFDDAA" : "#FFA07A",     // Pastel Peach (dark) / Light Salmon (light)
      Organization: theme === "dark" ? "#D7BFFF" : "#9370DB",// Pastel Lavender (dark) / Medium Purple (light)
      Location: theme === "dark" ? "#FFFFAA" : "#F0E68C",   // Pastel Yellow (dark) / Khaki (light)
      Event: theme === "dark" ? "#FFC0CB" : "#FFB6C1",      // Light Pink (dark) / Light Pink (light) - can be more distinct if needed
      Resource: theme === "dark" ? "#C1E1C1" : "#90EE90",   // Pastel Green (dark) / Light Green (light)
    };

    if (node.type && typeColorMap[node.type]) {
      color = typeColorMap[node.type];
    }
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
  const nodeCanvasObject = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = (isMobile ? 2 : 3) * (node.val || 1);
    const nodeColor = getNodeColor(node); // Get color for the node
    const isLocked = lockedNodes.has(node.id);
    
    // Draw the main circle
    ctx.fillStyle = nodeColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fill();

    // Draw lock indicator (e.g., a border) if locked
    if (isLocked) {
      ctx.strokeStyle = 'gold'; // Visual cue for locked state
      ctx.lineWidth = Math.max(1, 3 / globalScale); // Make it noticeable
      ctx.beginPath();
      // Draw the border slightly outside the node
      ctx.arc(node.x, node.y, size + ctx.lineWidth / 2 - (ctx.lineWidth > 1 ? 0.5 : 0) , 0, 2 * Math.PI, false);
      ctx.stroke();
    }

    // Draw the address preview text
    const label = node.address ? `${node.address.substring(0, 6)}...` : `${node.id.substring(0, 6)}...`;
    // Adjust font size dynamically: smaller when zoomed out, larger when zoomed in, but capped
    const baseFontSize = Math.max(1.5, Math.min(size / 2.8, 6)); // Base size related to node size
    const fontSize = baseFontSize / globalScale * 1.5; // Scale with zoom, with a multiplier for readability
    
    // Cap font size to prevent it from becoming too large or too small
    const effectiveFontSize = Math.max(1.5, Math.min(fontSize, size * 0.8));


    if (effectiveFontSize >= 1.5) { // Only draw if font size is reasonably large
        ctx.font = `${effectiveFontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = getContrastingTextColor(nodeColor);
        ctx.fillText(label, node.x, node.y);
    }
  };


  return (
    <div ref={containerRef} className="w-full h-full relative"> {/* Added relative positioning for the button */}
      {typeof window !== 'undefined' && data.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => `Type: ${node.type}<br/>Address: ${node.id}`} 
          // nodeColor={getNodeColor} // Removed as nodeCanvasObject handles coloring
          nodeRelSize={isMobile ? 2 : 3} // Base size, actual size determined by node.val in nodeCanvasObject
          nodeCanvasObject={nodeCanvasObject}
          linkWidth={(link: any) => Math.max(1, Math.min(2.5, (link.value || 0) / 500000))}
          linkColor={() => (theme === "dark" ? "rgba(220, 220, 220, 0.3)" : "rgba(100, 100, 100, 0.2)")} // Adjusted link colors
          linkLabel={(link: any) => `Type: ${link.transactionType}, Value: ${link.value}`}
          linkDirectionalParticles={3}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleColor={() => theme === "dark" ? "rgba(255, 105, 180, 0.9)" : "rgba(255, 20, 147, 0.75)"} // Kawaii particle colors (pinks)
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onNodeRightClick={handleNodeRightClick}
          onNodeDragEnd={handleNodeDragEnd}
          onEngineStop={handleEngineStop} // Added onEngineStop handler
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
      {/* Button to go to Root Node */}
      {rootNodeId && data.nodes.length > 0 && isGraphReady && (
        <Button
          variant="outline"
          size="icon"
          onClick={handleEngineStop}
          className="absolute bottom-4 left-4 z-10 bg-background/80 hover:bg-muted text-primary"
          title="Go to Root Node"
        >
          <LocateFixed className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
