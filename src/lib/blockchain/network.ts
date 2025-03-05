
import { Peer, Transaction, Block, UTXO, Wallet, SmartContract, createGenesisBlock, finalizeGenesisBlock, createSmartContract } from './models';

// Local storage keys
export const PEERS_STORAGE_KEY = 'blockchain_peers';

// Load peers from localStorage
export function loadPeersFromCache(): Peer[] | null {
  try {
    const peersJson = localStorage.getItem(PEERS_STORAGE_KEY);
    if (peersJson) {
      return JSON.parse(peersJson);
    }
  } catch (error) {
    console.error('Failed to load peers from cache:', error);
  }
  return null;
}

// Save peers to localStorage
export function savePeersToCache(peers: Peer[]): void {
  try {
    localStorage.setItem(PEERS_STORAGE_KEY, JSON.stringify(peers));
  } catch (error) {
    console.error('Failed to save peers to cache:', error);
  }
}

// Create a new peer
export function createPeer(id: number, port: number): Peer {
  const genesisBlock = createGenesisBlock();
  const finalizedGenesis = finalizeGenesisBlock(genesisBlock);
  
  return {
    id,
    wallet: null,
    isActive: false,
    blockchain: [finalizedGenesis],
    pendingTransactions: [],
    contracts: [],
    connections: []
  };
}

// Create a new wallet for a peer and automatically deploy standard contracts
export function createWalletForPeer(peer: Peer, publicKey: string, privateKey: string, address: string, port: number): Peer {
  peer.wallet = {
    publicKey,
    privateKey,
    address,
    utxos: [],
    port
  };
  
  peer.isActive = true;
  
  // Auto-deploy standard contracts
  const tokenContract = createSmartContract('token', `${address.substring(0, 6)}Token`, '', address);
  const storageContract = createSmartContract('storage', `${address.substring(0, 6)}Storage`, '', address);
  const auctionContract = createSmartContract('auction', `${address.substring(0, 6)}Auction`, '', address);
  
  peer.contracts = [tokenContract, storageContract, auctionContract];
  
  return peer;
}

// Deactivate a peer
export function deactivatePeer(peer: Peer): Peer {
  peer.isActive = false;
  return peer;
}

// Deploy a smart contract to a peer
export function deploySmartContract(peer: Peer, contract: SmartContract): Peer {
  if (!peer.isActive || !peer.wallet) {
    throw new Error('Peer must be active and have a wallet to deploy a contract');
  }
  
  peer.contracts.push(contract);
  return peer;
}

// Connect peers (bidirectional)
export function connectPeers(peer1: Peer, peer2: Peer): [Peer, Peer] {
  if (!peer1.connections.includes(peer2.id)) {
    peer1.connections.push(peer2.id);
  }
  
  if (!peer2.connections.includes(peer1.id)) {
    peer2.connections.push(peer1.id);
  }
  
  return [peer1, peer2];
}

// Broadcast a transaction to connected peers
export function broadcastTransaction(
  sourcePeer: Peer, 
  transaction: Transaction, 
  allPeers: Peer[]
): Peer[] {
  const updatedPeers = [...allPeers];
  
  // Add to source peer's pending transactions
  const sourcePeerIndex = updatedPeers.findIndex(p => p.id === sourcePeer.id);
  if (!updatedPeers[sourcePeerIndex].pendingTransactions.some(tx => tx.id === transaction.id)) {
    updatedPeers[sourcePeerIndex].pendingTransactions.push(transaction);
  }
  
  // Broadcast to connected peers
  for (const connectedPeerId of sourcePeer.connections) {
    const peerIndex = updatedPeers.findIndex(p => p.id === connectedPeerId);
    if (peerIndex !== -1 && updatedPeers[peerIndex].isActive) {
      if (!updatedPeers[peerIndex].pendingTransactions.some(tx => tx.id === transaction.id)) {
        updatedPeers[peerIndex].pendingTransactions.push(transaction);
      }
    }
  }
  
  return updatedPeers;
}

// Broadcast a block to connected peers
export function broadcastBlock(
  sourcePeer: Peer, 
  block: Block, 
  allPeers: Peer[]
): Peer[] {
  const updatedPeers = [...allPeers];
  
  // Add to source peer's blockchain
  const sourcePeerIndex = updatedPeers.findIndex(p => p.id === sourcePeer.id);
  if (!updatedPeers[sourcePeerIndex].blockchain.some(b => b.hash === block.hash)) {
    updatedPeers[sourcePeerIndex].blockchain.push(block);
    
    // Remove mined transactions from pending
    const txIds = block.transactions.map(tx => tx.id);
    updatedPeers[sourcePeerIndex].pendingTransactions = 
      updatedPeers[sourcePeerIndex].pendingTransactions.filter(tx => !txIds.includes(tx.id));
  }
  
  // Broadcast to connected peers
  for (const connectedPeerId of sourcePeer.connections) {
    const peerIndex = updatedPeers.findIndex(p => p.id === connectedPeerId);
    if (peerIndex !== -1 && updatedPeers[peerIndex].isActive) {
      if (!updatedPeers[peerIndex].blockchain.some(b => b.hash === block.hash)) {
        updatedPeers[peerIndex].blockchain.push(block);
        
        // Remove mined transactions from pending
        const txIds = block.transactions.map(tx => tx.id);
        updatedPeers[peerIndex].pendingTransactions = 
          updatedPeers[peerIndex].pendingTransactions.filter(tx => !txIds.includes(tx.id));
      }
    }
  }
  
  return updatedPeers;
}

// Get the UTXO set for a peer (from their blockchain)
export function getUTXOSet(peer: Peer): UTXO[] {
  const utxos: UTXO[] = [];
  const spentOutputs: { [key: string]: boolean } = {};
  
  // Process blocks in chronological order
  for (const block of peer.blockchain) {
    for (const tx of block.transactions) {
      
      for (const input of tx.inputs) {
        const outpointKey = `${input.txId}:${input.outputIndex}`;
        spentOutputs[outpointKey] = true;
      }
      
      // Add outputs to UTXO set if not spent
      tx.outputs.forEach((output, index) => {
        const outpointKey = `${tx.id}:${index}`;
        if (!spentOutputs[outpointKey]) {
          utxos.push({
            txId: tx.id,
            outputIndex: index,
            address: output.address,
            amount: output.amount
          });
        }
      });
    }
  }
  
  return utxos;
}

// Update the UTXO set for all wallets
export function updateWalletUTXOs(peers: Peer[]): Peer[] {
  return peers.map(peer => {
    if (peer.wallet) {
      const utxoSet = getUTXOSet(peer);
      peer.wallet.utxos = utxoSet.filter(utxo => utxo.address === peer.wallet!.address);
    }
    return peer;
  });
}

// Synchronize the blockchain between peers
export function synchronizeBlockchains(peers: Peer[]): Peer[] {
  // If we have inactive peers, skip them
  const activePeers = peers.filter(p => p.isActive);
  if (activePeers.length <= 1) return peers;
  
  // Find the longest valid chain among all peers
  let longestChain: Block[] = [];
  let longestLength = 0;
  
  for (const peer of activePeers) {
    if (peer.blockchain.length > longestLength) {
      longestChain = peer.blockchain;
      longestLength = peer.blockchain.length;
    }
  }
  
  // Update all peers to use the longest chain
  return peers.map(peer => {
    if (peer.isActive) {
      // Only update if the longest chain is actually longer
      if (longestChain.length > peer.blockchain.length) {
        peer.blockchain = [...longestChain];
        
        // Remove transactions that are already in the blockchain
        const blockchainTxIds = new Set<string>();
        for (const block of peer.blockchain) {
          for (const tx of block.transactions) {
            blockchainTxIds.add(tx.id);
          }
        }
        
        peer.pendingTransactions = peer.pendingTransactions.filter(
          tx => !blockchainTxIds.has(tx.id)
        );
      }
    }
    return peer;
  });
}