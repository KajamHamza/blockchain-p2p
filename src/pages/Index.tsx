import React, { useState, useEffect } from 'react';
import { toast } from "@/components/ui/use-toast";
import PeerNetworkView from '@/components/PeerNetworkView';
import PeerDetailView from '@/components/PeerDetailView';
import BlockchainView from '@/components/BlockchainView';
import PendingTransactionsView from '@/components/PendingTransactionsView';
import SmartContractsView from '@/components/SmartContractsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { 
  Peer, 
  Transaction, 
  Block,
  SmartContract,
  createBlock,
  createCoinbaseTransaction,
  createGenesisBlock,
  finalizeGenesisBlock,
  executeSmartContract
} from '@/lib/blockchain/models';

import {
  createPeer,
  createWalletForPeer,
  deactivatePeer,
  connectPeers,
  broadcastTransaction,
  broadcastBlock,
  getUTXOSet,
  updateWalletUTXOs,
  synchronizeBlockchains,
  loadPeersFromCache,
  savePeersToCache,
  deploySmartContract
} from '@/lib/blockchain/network';

import { generateKeyPair, generateAddress } from '@/lib/blockchain/crypto';

const BASE_PORT = 8000;
const MINING_REWARD = 10;
const MINING_DIFFICULTY = 2;
const TRANSACTIONS_PER_BLOCK = 5;

const PEERS_STORAGE_KEY = 'blockchain-simulator-peers';
const CONTRACTS_STORAGE_KEY = 'blockchain-simulator-contracts';

const Index = () => {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
  const [isMining, setIsMining] = useState<boolean>(false);
  
  useEffect(() => {
    const cachedPeers = loadPeersFromCache();
    
    if (cachedPeers && cachedPeers.length > 0) {
      setPeers(cachedPeers);
      toast({
        title: "Data Loaded",
        description: "Loaded blockchain data from cache",
      });
    } else {
      const initialPeers: Peer[] = [];
      
      for (let i = 1; i <= 4; i++) {
        const peer = createPeer(i, BASE_PORT + i);
        initialPeers.push(peer);
      }
      
      for (let i = 0; i < initialPeers.length; i++) {
        for (let j = i + 1; j < initialPeers.length; j++) {
          const [updatedPeer1, updatedPeer2] = connectPeers(initialPeers[i], initialPeers[j]);
          initialPeers[i] = updatedPeer1;
          initialPeers[j] = updatedPeer2;
        }
      }
      
      setPeers(initialPeers);
    }
  }, []);
  
  useEffect(() => {
    if (peers.length > 0) {
      savePeersToCache(peers);
    }
  }, [peers]);
  
  const selectedPeer = peers.find(peer => peer.id === selectedPeerId) || null;
  
  const handlePeerSelect = (peer: Peer) => {
    setSelectedPeerId(peer.id);
    
    if (!peer.isActive) {
      activatePeer(peer.id);
    }
  };
  
  const activatePeer = (peerId: number) => {
    setPeers(currentPeers => {
      const updatedPeers = [...currentPeers];
      const peerIndex = updatedPeers.findIndex(p => p.id === peerId);
      
      if (peerIndex !== -1) {
        const { publicKey, privateKey } = generateKeyPair();
        const address = generateAddress(publicKey);
        
        const port = BASE_PORT + peerId;
        updatedPeers[peerIndex] = createWalletForPeer(
          updatedPeers[peerIndex],
          publicKey,
          privateKey,
          address,
          port
        );
        
        if (updatedPeers[peerIndex].blockchain.length === 1) {
          const coinbaseTx = createCoinbaseTransaction(address, 100);
          const newBlock = createBlock(
            1,
            updatedPeers[peerIndex].blockchain[0].hash,
            [coinbaseTx],
            1,
            address
          );
          
          updatedPeers[peerIndex].blockchain.push(newBlock);
        }
        
        const utxoSet = getUTXOSet(updatedPeers[peerIndex]);
        if (updatedPeers[peerIndex].wallet) {
          updatedPeers[peerIndex].wallet.utxos = utxoSet.filter(
            utxo => utxo.address === address
          );
        }
        
        toast({
          title: "Peer Activated",
          description: `Peer ${peerId} has been activated with wallet address: ${address.substring(0, 10)}...`,
        });
      }
      
      return updatedPeers;
    });
  };
  
  const deactivatePeerHandler = (peerId: number) => {
    setPeers(currentPeers => {
      const updatedPeers = [...currentPeers];
      const peerIndex = updatedPeers.findIndex(p => p.id === peerId);
      
      if (peerIndex !== -1 && updatedPeers[peerIndex].isActive) {
        updatedPeers[peerIndex] = deactivatePeer(updatedPeers[peerIndex]);
        
        toast({
          title: "Peer Deactivated",
          description: `Peer ${peerId} has been deactivated`,
        });
      }
      
      return updatedPeers;
    });
  };
  
  const handleSendTransaction = (transaction: Transaction | null, recipientId: number) => {
    if (!transaction) {
      toast({
        title: "Transaction Failed",
        description: "Failed to create transaction. Please check your balance.",
        variant: "destructive"
      });
      return;
    }
    
    setPeers(currentPeers => {
      const sourcePeer = currentPeers.find(p => p.id === selectedPeerId);
      if (!sourcePeer) return currentPeers;
      
      const updatedPeers = broadcastTransaction(sourcePeer, transaction, currentPeers);
      
      return updateWalletUTXOs(updatedPeers);
    });
  };
  
  const handleMineBlock = (peerId: number) => {
    setPeers(currentPeers => {
      const peerIndex = currentPeers.findIndex(p => p.id === peerId);
      if (peerIndex === -1) return currentPeers;
      
      const peer = currentPeers[peerIndex];
      if (!peer.wallet || peer.pendingTransactions.length === 0) {
        return currentPeers;
      }
      
      setIsMining(true);
      
      const transactionsToMine = peer.pendingTransactions.slice(0, TRANSACTIONS_PER_BLOCK);
      
      const coinbaseTx = createCoinbaseTransaction(peer.wallet.address, MINING_REWARD);
      const allTransactions = [coinbaseTx, ...transactionsToMine];
      
      const newBlock = createBlock(
        peer.blockchain.length,
        peer.blockchain[peer.blockchain.length - 1].hash,
        allTransactions,
        MINING_DIFFICULTY,
        peer.wallet.address
      );
      
      toast({
        title: "Block Mined",
        description: `Peer ${peerId} successfully mined block #${newBlock.index}`,
      });
      
      let updatedPeers = broadcastBlock(peer, newBlock, currentPeers);
      
      updatedPeers = updateWalletUTXOs(updatedPeers);
      
      updatedPeers = synchronizeBlockchains(updatedPeers);
      
      setIsMining(false);
      return updatedPeers;
    });
  };
  
  const handleDeployContract = (contract: SmartContract) => {
    if (!selectedPeer || !selectedPeer.wallet) {
      toast({
        title: "Error",
        description: "Cannot deploy contract: No active peer selected",
        variant: "destructive"
      });
      return;
    }
    
    setPeers(currentPeers => {
      const peerIndex = currentPeers.findIndex(p => p.id === selectedPeerId);
      if (peerIndex === -1) return currentPeers;
      
      try {
        const updatedPeers = [...currentPeers];
        updatedPeers[peerIndex] = deploySmartContract(updatedPeers[peerIndex], contract);
        return updatedPeers;
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to deploy smart contract",
          variant: "destructive"
        });
        return currentPeers;
      }
    });
  };
  
  const handleExecuteContract = (contract: SmartContract, method: string, params: any[]) => {
    if (!selectedPeer || !selectedPeer.wallet) {
      toast({
        title: "Error",
        description: "Cannot execute contract: No active peer selected",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const result = executeSmartContract(
        contract,
        method,
        params,
        selectedPeer.wallet.address
      );
      
      if (result.error) {
        toast({
          title: "Contract Execution Failed",
          description: result.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Contract Executed",
          description: `Method ${method} executed successfully`,
        });
        
        setPeers(currentPeers => {
          const updatedPeers = [...currentPeers];
          const peerIndex = updatedPeers.findIndex(p => p.id === selectedPeerId);
          
          if (peerIndex !== -1) {
            const contractIndex = updatedPeers[peerIndex].contracts.findIndex(
              c => c.address === contract.address
            );
            
            if (contractIndex !== -1) {
              updatedPeers[peerIndex].contracts[contractIndex] = { ...contract };
            }
          }
          
          return updatedPeers;
        });
      }
      
      console.log('Contract execution result:', result);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute smart contract",
        variant: "destructive"
      });
    }
  };
  
  const handleClearCache = () => {
    try {
      localStorage.removeItem(PEERS_STORAGE_KEY);
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cache",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container py-8 max-w-screen-xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Blockchain Network</h1>
          <p className="text-gray-500">Real peer-to-peer blockchain with UTXO model and smart contracts</p>
        </div>
        <button 
          onClick={handleClearCache}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
        >
          Reset Data
        </button>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Peer Network</h2>
          <PeerNetworkView 
            peers={peers} 
            onPeerSelect={handlePeerSelect} 
            selectedPeerId={selectedPeerId} 
          />
          <Separator className="my-6" />
        </div>
        
        <div className="space-y-6 lg:col-span-1">
          {selectedPeer ? (
            <PeerDetailView 
              peer={selectedPeer}
              peers={peers}
              onSendTransaction={handleSendTransaction}
              onMineBlock={handleMineBlock}
              onDeactivate={deactivatePeerHandler}
              miningReward={MINING_REWARD}
            />
          ) : (
            <div className="glass rounded-lg p-6 text-center">
              <h2 className="text-lg font-semibold mb-3">No Peer Selected</h2>
              <p className="text-gray-500">Select a peer to view details and perform actions</p>
            </div>
          )}
          
          {selectedPeer && selectedPeer.pendingTransactions.length > 0 && (
            <PendingTransactionsView 
              transactions={selectedPeer.pendingTransactions} 
            />
          )}
        </div>
        
        <div className="lg:col-span-2">
          <Tabs defaultValue="blockchain">
            <TabsList className="mb-4">
              <TabsTrigger value="blockchain">Blockchain Explorer</TabsTrigger>
              <TabsTrigger value="smart-contracts">Smart Contracts</TabsTrigger>
            </TabsList>
            
            <TabsContent value="blockchain" className="space-y-4">
              {selectedPeer ? (
                <BlockchainView blockchain={selectedPeer.blockchain} />
              ) : (
                <div className="glass rounded-lg p-6 text-center">
                  <h2 className="text-lg font-semibold mb-3">No Blockchain Selected</h2>
                  <p className="text-gray-500">Select a peer to view their blockchain</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="smart-contracts">
              {selectedPeer ? (
                <SmartContractsView 
                  peer={selectedPeer}
                  onDeploy={handleDeployContract}
                  onExecute={handleExecuteContract}
                />
              ) : (
                <div className="glass rounded-lg p-6 text-center">
                  <h2 className="text-lg font-semibold mb-3">No Peer Selected</h2>
                  <p className="text-gray-500">Select a peer to view and deploy smart contracts</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Index;
