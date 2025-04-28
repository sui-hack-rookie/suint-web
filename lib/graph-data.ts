type Node = {
  id: string
  name: string
  type: string
  status: string
  val: number
}

type Link = {
  source: string
  target: string
  value: number
}

type GraphData = {
  nodes: Node[]
  links: Link[]
}

const NODE_TYPES = ["Person", "Organization", "Location", "Event", "Resource"]
const NODE_STATUSES = ["Active", "Inactive", "Pending", "Archived"]

// Generate a random name for a node
const generateNodeName = (type: string, index: number): string => {
  const prefixes = {
    Person: ["John", "Jane", "Alex", "Maria", "Sam", "Emma", "Michael", "Sarah"],
    Organization: ["Tech", "Global", "Acme", "Apex", "Summit", "Horizon", "Pinnacle", "Vertex"],
    Location: ["New York", "London", "Tokyo", "Paris", "Berlin", "Sydney", "Toronto", "Singapore"],
    Event: ["Conference", "Meeting", "Workshop", "Seminar", "Summit", "Expo", "Symposium", "Forum"],
    Resource: ["Database", "Server", "API", "Document", "Report", "Dashboard", "Tool", "Platform"],
  }

  const suffixes = {
    Person: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"],
    Organization: ["Inc", "LLC", "Corp", "Group", "Systems", "Solutions", "Technologies", "Enterprises"],
    Location: ["City", "District", "Region", "Area", "Center", "Hub", "Zone", "Quarter"],
    Event: ["2023", "Annual", "Quarterly", "Monthly", "Weekly", "Special", "Premier", "Global"],
    Resource: ["v1", "Pro", "Enterprise", "Cloud", "Core", "Advanced", "Premium", "Standard"],
  }

  const prefix = prefixes[type][Math.floor(Math.random() * prefixes[type].length)]
  const suffix = suffixes[type][Math.floor(Math.random() * suffixes[type].length)]

  return `${prefix} ${suffix}`
}

// Generate random graph data
export const generateGraphData = (nodeCount: number, linkCount: number): GraphData => {
  const nodes: Node[] = []
  const links: Link[] = []

  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    const type = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)]
    const status = NODE_STATUSES[Math.floor(Math.random() * NODE_STATUSES.length)]

    nodes.push({
      id: `node-${i}`,
      name: generateNodeName(type, i),
      type,
      status,
      val: 1 + Math.floor(Math.random() * 10), // Node size variation
    })
  }

  // Generate links
  for (let i = 0; i < linkCount; i++) {
    const sourceIndex = Math.floor(Math.random() * nodeCount)
    let targetIndex = Math.floor(Math.random() * nodeCount)

    // Avoid self-loops
    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(Math.random() * nodeCount)
    }

    links.push({
      source: `node-${sourceIndex}`,
      target: `node-${targetIndex}`,
      value: 1 + Math.floor(Math.random() * 5), // Link strength variation
    })
  }

  return { nodes, links }
}
