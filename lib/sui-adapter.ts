// Imports
import { 
  getFullnodeUrl, 
  SuiClient, 
  SuiTransactionBlockResponse, 
  SuiTransactionBlockResponseOptions,
  PaginatedTransactionResponse
} from '@mysten/sui.js/client';

// Detailed Sui SDK-like interfaces
export interface SuiGasData {
  payment: SuiObjectRef[];
  owner: string;
  price: string;
  budget: string;
}

export interface SuiTransactionKind {
  // Simplified: in reality, this could be MoveCall, TransferObjects, etc.
  // For now, we don't dive deep into kinds for this POC
  // We'll primarily rely on effects to determine interactions
  [key: string]: any; 
}

export interface SuiTransactionBlockData {
  messageVersion: 'v1';
  transaction: {
    kind: 'ProgrammableTransaction'; // Or other kinds
    inputs: any[]; // Simplified
    transactions: SuiTransactionKind[]; // Simplified
  };
  sender: string;
  gasData: SuiGasData;
}

export interface SuiTransactionBlockEffects {
  // Simplified: focus on fields that help identify sender/recipients/objects
  status: {
    status: 'success' | 'failure';
    error?: string;
  };
  gasUsed: {
    computationCost: string;
    storageCost: string;
    storageRebate: string;
    nonRefundableStorageFee: string;
  };
  executedEpoch: string;
  dependencies?: string[];
  transactionDigest: string;
  mutated?: SuiObjectRef[];
  created?: SuiObjectRef[];
  deleted?: SuiObjectRef[];
  wrapped?: SuiObjectRef[];
  gasObject: SuiObjectRef;
  eventsDigest?: string;
  // Other fields like balanceChanges might be useful
  balanceChanges?: Array<{
    owner: { AddressOwner: string } | { ObjectOwner: string } | { Shared: { object_id: string }}; // And other owner types
    coinType: string;
    amount: string; // Can be positive or negative
  }>;
  objectChanges?: Array<{
    type: 'mutated' | 'created' | 'deleted' | 'published' | 'transferred';
    sender: string;
    owner?: { AddressOwner: string } | { ObjectOwner: string } | { Shared: { object_id: string }} | 'Immutable'; // Owner property might not exist for all change types
    recipient?: { AddressOwner: string } | { ObjectOwner: string } | { Shared: { object_id: string }} | 'Immutable'; // Add recipient for transferred objects
    objectType: string;
    objectId: string;
    version: string;
    previousVersion?: string;
    digest: string;
  }>
}

// Refined SuiTransaction interface
export interface SuiTransaction {
  id: string; // Transaction digest
  timestamp: Date;
  sender: string;
  recipients: string[]; // Addresses that received objects or SUI
  amount: number; // Approximate SUI amount transferred, if identifiable
  gasUsed: number; // Total gas computation cost
  status: 'success' | 'failure';
  details?: { // Store raw transaction and effects for deeper analysis if needed
    transactionBlock: SuiTransactionBlockResponse['transaction'];
    effects: SuiTransactionBlockResponse['effects'];
  };
  // Add other relevant transaction details here, e.g., specific event data
}


// Interfaces from previous steps (SuiObjectRef, GraphData, Node, Link)
export interface SuiObjectRef {
  objectId: string;
  version: string | number; // version can be string or number depending on SDK version
  digest: string;
}

// Graph Data Types (compatible with react-force-graph-2d)
export interface Node {
  id: string;      // Unique identifier (e.g., Sui address)
  name: string;    // Display name (e.g., Sui address or alias)
  type: string;    // Type of node (e.g., 'wallet', 'contract', 'object')
  address?: string; // Sui address, if applicable
  val?: number;     // Optional: for node size in graph
  // Add other react-force-graph-2d compatible fields as needed
}

export interface Link {
  source: string;  // ID of the source node
  target: string;  // ID of the target node
  value?: number;   // Optional: for link thickness or strength (represents transaction amount or nominal value)
  transactionId?: string; // Sui transaction ID
  transactionType?: string; // Type of transaction (e.g., 'transfer', 'publish')
  flow?: 'in' | 'out' | 'internal'; // Flow direction relative to the rootAddress
  // Add other react-force-graph-2d compatible fields as needed
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

// Custom Error Type for the adapter
export type SuiAdapterErrorType = 'InvalidAddress' | 'NetworkError' | 'UnknownFetchError' | 'NoTransactions';

export class SuiAdapterError extends Error {
  constructor(public errorType: SuiAdapterErrorType, message: string) {
    super(message);
    this.name = 'SuiAdapterError';
    Object.setPrototypeOf(this, SuiAdapterError.prototype);
  }
}

// Initialize Sui Client
// TODO: Make RPC endpoint configurable
const rpcUrl = getFullnodeUrl('mainnet');
const client = new SuiClient({ url: rpcUrl });

const TX_QUERY_LIMIT = 50; // Max 50 transactions per query type

/**
 * Fetches and processes transaction blocks for a given Sui address.
 *
 * @param address - The Sui address to fetch transactions for.
 * @returns A promise that resolves to an array of processed SuiTransaction objects.
 * @throws {SuiAdapterError} If fetching or processing fails.
 */
export async function fetchTransactionsForAddress(address: string): Promise<SuiTransaction[]> {
  console.log(`Fetching transactions for address: ${address}`);
  
  // Basic address validation (Sui addresses are typically 0x followed by 64 hex chars)
  if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
    console.error(`Invalid address format: ${address}`);
    throw new SuiAdapterError('InvalidAddress', 'Invalid Sui address format.');
  }

  const allTransactionsMap = new Map<string, SuiTransaction>();

  const options: SuiTransactionBlockResponseOptions = {
    showInput: true,
    showEffects: true,
    showObjectChanges: true,
    showBalanceChanges: true,
    // Not showing events or rawInput for now to keep response size manageable
  };

  try {
    // Fetch transactions sent FROM the address
    let fromCursor: string | null | undefined = null;
    let fromTotalFetched = 0;
    console.log(`Fetching 'FromAddress' transactions for ${address}`);
    const fromTxs = await client.queryTransactionBlocks({
      filter: { FromAddress: address },
      options,
      limit: TX_QUERY_LIMIT,
      cursor: fromCursor,
    });
    fromTotalFetched += fromTxs.data.length;
    processTransactionResponses(fromTxs.data, allTransactionsMap, address);
    // Basic pagination example (fetch one more page if available, respecting overall limit for this category)
    // For a real app, you'd loop until hasNextPage is false or a total limit is reached.
    // if (fromTxs.hasNextPage && fromTotalFetched < TX_QUERY_LIMIT) {
    //   const nextPage = await client.queryTransactionBlocks({ /* ... */ });
    //   processTransactionResponses(nextPage.data, allTransactionsMap, address);
    // }


    // Fetch transactions sent TO the address
    let toCursor: string | null | undefined = null;
    let toTotalFetched = 0;
    console.log(`Fetching 'ToAddress' transactions for ${address}`);
    const toTxs = await client.queryTransactionBlocks({
      filter: { ToAddress: address },
      options,
      limit: TX_QUERY_LIMIT,
      cursor: toCursor,
    });
    toTotalFetched += toTxs.data.length;
    processTransactionResponses(toTxs.data, allTransactionsMap, address);
    // Basic pagination for 'ToAddress' similar to 'FromAddress' can be added here
    
    // TODO: Consider other query types like InputObject if necessary for the use case

    console.log(`Total unique transactions fetched: ${allTransactionsMap.size}`);
    return Array.from(allTransactionsMap.values());

  } catch (error) {
    console.error("Error fetching or processing Sui transactions:", error);
    // It might be better to throw the error or return a result indicating failure
    // For now, returning empty array on error to prevent UI crash - THIS WILL BE CHANGED
    // throw error; // Re-throw the original error or a custom one
    if (error instanceof SuiAdapterError) {
      throw error;
    }
    // Check for common network error patterns (this is very basic)
    if (error.message.includes('Failed to fetch') || error.message.includes('network error')) {
      throw new SuiAdapterError('NetworkError', `Network error: ${error.message}`);
    }
    // For other errors, wrap them in a generic SuiAdapterError
    throw new SuiAdapterError('UnknownFetchError', `An unknown error occurred: ${error.message}`);
  }
}

/**
 * Processes raw SuiTransactionBlockResponse objects and maps them to SuiTransaction.
 * Adds processed transactions to the provided map, ensuring de-duplication.
 * @param responses - Array of SuiTransactionBlockResponse from the SDK.
 * @param map - Map to store unique processed transactions by digest.
 * @param _queriedAddress - The address for which transactions are being queried (optional, for context).
 */
function processTransactionResponses(
  responses: SuiTransactionBlockResponse[],
  map: Map<string, SuiTransaction>,
  _queriedAddress?: string
) {
  responses.forEach(txBlock => {
    if (map.has(txBlock.digest)) {
      return; // Already processed
    }

    const sender = txBlock.transaction?.data.sender || 'N/A';
    const recipients: string[] = [];
    let totalAmountTransferred = 0;

    // Attempt to identify recipients and amounts from balanceChanges and objectChanges
    if (txBlock.balanceChanges) {
      txBlock.balanceChanges.forEach(change => {
        if (change.owner && typeof change.owner === 'object' && 'AddressOwner' in change.owner) {
          const recipientAddress = change.owner.AddressOwner;
          if (recipientAddress !== sender) { // Exclude sender from recipients list
             if (!recipients.includes(recipientAddress)) recipients.push(recipientAddress);
          }
          // Consider only positive amounts as "sent" to recipient for simplicity
          // Note: amount is a string, needs parsing.
          const amount = parseInt(change.amount, 10);
          if (amount > 0 && recipientAddress !== sender) { 
            totalAmountTransferred += amount;
          }
        }
      });
    }
    
    // A more robust recipient detection might look at effects.mutated, effects.created, etc.
    // and check ownership changes. For this POC, balanceChanges is a starting point.
    // If no recipients from balanceChanges, try to infer from objectChanges (transferred objects)
    if (recipients.length === 0 && txBlock.objectChanges) {
        txBlock.objectChanges.forEach(change => {
            // For transferred objects, check recipient property
            if (change.type === 'transferred' && change.recipient && typeof change.recipient === 'object' && 'AddressOwner' in change.recipient) {
                const recipientAddress = change.recipient.AddressOwner;
                if (recipientAddress !== sender && !recipients.includes(recipientAddress)) {
                    recipients.push(recipientAddress);
                }
            }
        });
    }
    // If still no recipients, and it's a self-send or complex interaction, add sender as placeholder
    if (recipients.length === 0 && sender === _queriedAddress) {
        // For self-sends or complex txs where the queried address is the sender but no other recipients are obvious
        // we can add the sender itself to the recipients list if it makes sense for the graph visualization
        // or leave it empty. For now, let's leave it empty to avoid misrepresenting.
    }


    const processedTx: SuiTransaction = {
      id: txBlock.digest,
      timestamp: new Date(parseInt(txBlock.timestampMs || "0", 10)),
      sender,
      recipients,
      amount: totalAmountTransferred, // This is a simplification
      gasUsed: parseFloat(txBlock.effects?.gasUsed.computationCost || "0") + 
               parseFloat(txBlock.effects?.gasUsed.storageCost || "0") - 
               parseFloat(txBlock.effects?.gasUsed.storageRebate || "0"),
      status: txBlock.effects?.status.status || 'failure',
      details: {
        transactionBlock: txBlock.transaction,
        effects: txBlock.effects,
      },
    };
    map.set(txBlock.digest, processedTx);
  });
}


// Example usage (optional, for testing)
// async function main() {
//   const exampleAddress = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Replace with a real address for testing
//   const transactions = await fetchTransactionsForAddress(exampleAddress);
//   console.log(`Fetched ${transactions.length} transactions:`);
//   transactions.forEach(tx => {
//     console.log(`  ID: ${tx.id}, Sender: ${tx.sender}, Recipients: ${tx.recipients.join(', ')}, Amount: ${tx.amount}, Status: ${tx.status}`);
//   });
//
//   if (transactions.length > 0) {
//      const graphData = await transformSuiTransactionsToGraphData(transactions, exampleAddress);
//      console.log(JSON.stringify(graphData, null, 2));
//   }
// }
// // main(); // Uncomment to run example for testing

/**
 * Transforms an array of SuiTransaction objects into a graph data structure 
 * suitable for react-force-graph-2d.
 *
 * @param transactions - An array of SuiTransaction objects.
 * @param rootAddress - The primary address for which the graph is being generated.
 * @returns A promise that resolves to an object containing nodes and links.
 */
export async function transformSuiTransactionsToGraphData(
  transactions: SuiTransaction[],
  rootAddress: string
): Promise<GraphData> {
  const nodes: Node[] = [];
  const links: Link[] = [];
  const nodeIds = new Set<string>(); // To keep track of unique nodes

  // Helper function to add a node if it doesn't already exist
  const addNode = (id: string, defaultType: string = 'wallet', customName?: string, defaultVal?: number) => {
    if (!id || typeof id !== 'string') { // Basic validation for id
      console.warn(`Attempted to add a node with invalid ID: ${id}`);
      return;
    }
    if (!nodeIds.has(id)) {
      const isRoot = id === rootAddress;
      const type = isRoot ? 'root' : defaultType;
      // Ensure name is a string, default to id if customName is not provided
      const name = customName || (isRoot ? `Root: ${id.substring(0, 6)}...` : `Wallet: ${id.substring(0, 6)}...`);
      const val = defaultVal || (isRoot ? 5 : 1);

      nodes.push({
        id,
        name,
        type,
        address: id,
        val,
      });
      nodeIds.add(id);
    }
  };

  // Add the root address as the central node
  addNode(rootAddress, 'root', `Root: ${rootAddress.substring(0, 6)}...`, 10); // Give root node more visual weight

  // Process transactions to create nodes and links
  transactions.forEach(tx => {
    if (!tx || typeof tx.sender !== 'string' || !tx.sender) {
      console.warn(`Skipping transaction with invalid sender: ${JSON.stringify(tx)}`);
      return;
    }
    
    // Add sender as a node
    // Use a slightly different naming for non-root nodes to distinguish
    addNode(tx.sender, 'wallet', `User: ${tx.sender.substring(0, 6)}...`, 2);

    if (tx.recipients && tx.recipients.length > 0) {
      tx.recipients.forEach(recipientAddress => {
        if (typeof recipientAddress !== 'string' || !recipientAddress) {
          console.warn(`Skipping invalid recipient address in transaction ${tx.id}: ${recipientAddress}`);
          return;
        }
        
        // Add recipient as a node
        addNode(recipientAddress, 'wallet', `User: ${recipientAddress.substring(0, 6)}...`, 2);

        // Create a link from sender to this recipient
        // Ensure both nodes exist before creating a link (addNode handles uniqueness)
        if (nodeIds.has(tx.sender) && nodeIds.has(recipientAddress)) {
          let flowDirection: 'in' | 'out' | 'internal' | undefined = undefined;
          if (tx.sender === rootAddress && recipientAddress === rootAddress) {
            flowDirection = 'internal';
          } else if (tx.sender === rootAddress) {
            flowDirection = 'out';
          } else if (recipientAddress === rootAddress) {
            flowDirection = 'in';
          }
          // If neither sender nor recipient is the rootAddress, flow is undefined or could be 'other'
          // For this filtering, we are primarily interested in flows involving the rootAddress.

          links.push({
            source: tx.sender,
            target: recipientAddress,
            transactionId: tx.id,
            transactionType: tx.status === 'success' ? 'Transfer/Interaction' : 'Failed Tx',
            value: tx.recipients.length === 1 ? tx.amount : 1, // Use actual amount for 1-to-1, nominal for 1-to-many
            flow: flowDirection,
          });
        }
      });
    } else {
      // Handle transactions with no recipients (e.g., contract calls, self-sends not captured as recipient)
      // Optionally, create a "self-link" or a link to a generic "contract interaction" node if sender is interacting with a contract
      // For now, we just log or skip. If the sender is the rootAddress, it might just be an interaction.
      console.log(`Transaction ${tx.id} from ${tx.sender} has no explicit recipients in the processed data.`)
    }
  });
  
  console.log(`Transformed ${transactions.length} transactions into ${nodes.length} nodes and ${links.length} links.`);
  return { nodes, links };
}
