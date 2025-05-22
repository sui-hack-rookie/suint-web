export type BalanceChange = {
  coinType: string;
  amount: string;
  owner: string;
  address_type: string;
};

export type Transaction = {
  digest: string;
  sender: string;
  timestamp: string;
  balanceChanges: BalanceChange[];
  receivers: string[];
};

export type Node = {
  id: string;
  name: string; // Use address as name for now
  type: string; // e.g., 'Address', 'Sender', 'Receiver'
  status: string; // Default status
  val: number; // Default size
};

export type Link = {
  source: string;
  target: string;
  value: number; // Default value or based on transaction amount/count
  digest?: string; // Optional: store transaction digest
  timestamp?: string; // Optional: store timestamp
};

export type GraphData = {
  nodes: Node[];
  links: Link[];
};

// Function to fetch transactions for a given address
export async function fetchTransactions(address: string): Promise<Transaction[]> {
  // Replace with your actual API endpoint structure
  const response = await fetch(`http://localhost:8000/transaction/to/${address}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }
  const data = await response.json();
  // Add basic validation if necessary
  if (!Array.isArray(data)) {
    throw new Error("Invalid API response format");
  }
  return data as Transaction[];
}

// Function to transform API transaction data into graph data format
export function transformTransactionsToGraphData(transactions: Transaction[], sourceAddress: string): GraphData {
  const nodesMap = new Map<string, Node>();
  const links: Link[] = [];

  // Ensure the source address node exists
  if (!nodesMap.has(sourceAddress)) {
    nodesMap.set(sourceAddress, {
      id: sourceAddress,
      name: sourceAddress.substring(0, 8) + '...', // Shorten name for display
      type: 'SourceAddress',
      status: 'Active',
      val: 10, // Make source node slightly larger
    });
  }

  transactions.forEach((tx) => {
    // Ensure sender node exists (might be different from sourceAddress if fetching 'to' transactions later)
    if (!nodesMap.has(tx.sender)) {
      nodesMap.set(tx.sender, {
        id: tx.sender,
        name: tx.sender.substring(0, 8) + '...',
        type: 'Sender',
        status: 'Active',
        val: 5,
      });
    }

    // Process receivers
    tx.receivers.forEach((receiver) => {
      // Ensure receiver node exists
      if (!nodesMap.has(receiver)) {
        nodesMap.set(receiver, {
          id: receiver,
          name: receiver.substring(0, 8) + '...',
          type: 'Receiver',
          status: 'Active',
          val: 5,
        });
      }

      // Add link from sender to receiver for this transaction
      links.push({
        source: tx.sender,
        target: receiver,
        value: 1, // Simple link value, could be based on tx amount later
        digest: tx.digest,
        timestamp: tx.timestamp,
      });
    });
  });

  const nodes = Array.from(nodesMap.values());
  return { nodes, links };
}
