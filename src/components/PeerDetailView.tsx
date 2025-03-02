
import React, { useState } from 'react';
import { Peer, Transaction, createTransaction, getWalletBalance } from '@/lib/blockchain/models';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Pickaxe } from '@/components/ui/icons';

interface PeerDetailViewProps {
  peer: Peer;
  peers: Peer[];
  onSendTransaction: (transaction: Transaction | null, recipientId: number) => void;
  onMineBlock: (peerId: number) => void;
  onDeactivate: (peerId: number) => void;
  miningReward: number;
}

const PeerDetailView: React.FC<PeerDetailViewProps> = ({ 
  peer, 
  peers, 
  onSendTransaction,
  onMineBlock,
  onDeactivate,
  miningReward
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  
  const handleSend = () => {
    if (!peer.wallet) {
      toast({
        title: "Error",
        description: "Wallet not activated for this peer",
        variant: "destructive"
      });
      return;
    }
    
    if (recipientId === null) {
      toast({
        title: "Error",
        description: "Please select a recipient",
        variant: "destructive"
      });
      return;
    }
    
    const recipientPeer = peers.find(p => p.id === recipientId);
    if (!recipientPeer || !recipientPeer.wallet) {
      toast({
        title: "Error",
        description: "Recipient peer not found or not activated",
        variant: "destructive"
      });
      return;
    }
    
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }
    
    const balance = getWalletBalance(peer.wallet);
    if (amount > balance) {
      toast({
        title: "Error",
        description: `Insufficient funds. Balance: ${balance} coins`,
        variant: "destructive"
      });
      return;
    }
    
    const tx = createTransaction(
      peer.wallet,
      recipientPeer.wallet.address,
      amount,
      peer.wallet.utxos
    );
    
    if (!tx) {
      toast({
        title: "Error",
        description: "Failed to create transaction. Check your balance and UTXOs.",
        variant: "destructive"
      });
      return;
    }
    
    onSendTransaction(tx, recipientId);
    setAmount(0);
    
    toast({
      title: "Transaction sent",
      description: `Sent ${amount} coins to Peer ${recipientId}`,
    });
  };
  
  const handleMine = () => {
    onMineBlock(peer.id);
  };
  
  const handleDeactivate = () => {
    onDeactivate(peer.id);
  };
  
  return (
    <div className="glass rounded-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center peer-${peer.id}-bg mr-3`}>
            <span className="text-white font-medium">{peer.id}</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Peer {peer.id}</h2>
            <p className="text-sm text-gray-500">Port: {peer.wallet?.port || 'Not activated'}</p>
          </div>
        </div>
        
        {peer.isActive && (
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeactivate}
          >
            Deactivate
          </Button>
        )}
      </div>
      
      {peer.wallet ? (
        <>
          <div className="mb-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Wallet Address</h3>
              <p className="font-mono text-sm bg-gray-50 p-2 rounded-md break-all">{peer.wallet.address}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Balance</h3>
                <p className="text-2xl font-semibold">{getWalletBalance(peer.wallet)} coins</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">UTXOs</h3>
                <p className="text-2xl font-semibold">{peer.wallet.utxos.length}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3">Send Transaction</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">Recipient</label>
                <select 
                  className="w-full p-2 border border-gray-200 rounded-md"
                  value={recipientId || ''}
                  onChange={(e) => setRecipientId(parseInt(e.target.value) || null)}
                >
                  <option value="">Select recipient</option>
                  {peers
                    .filter(p => p.id !== peer.id && p.isActive && p.wallet)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        Peer {p.id} ({p.wallet!.address.substring(0, 10)}...)
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">Amount</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-gray-200 rounded-md"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <Button
                onClick={handleSend}
                className={`w-full peer-${peer.id}-bg hover:bg-opacity-90 transition-colors`}
                variant="default"
              >
                Send Transaction
              </Button>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-md font-medium mb-3">Mining</h3>
            <div className="bg-gray-50 p-4 rounded-md mb-3">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Pending Transactions:</span>
                <span className="text-sm">{peer.pendingTransactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Blockchain Height:</span>
                <span className="text-sm">{peer.blockchain.length}</span>
              </div>
            </div>
            
            <Button
              onClick={handleMine}
              disabled={peer.pendingTransactions.length === 0}
              className="w-full bg-yellow-500 hover:bg-yellow-600"
              variant="outline"
            >
              <Pickaxe className="h-4 w-4 mr-2" />
              Mine Block (Reward: {miningReward} coins)
            </Button>
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-3">Connections</h3>
            <div className="grid grid-cols-4 gap-2">
              {peer.connections.map(connId => {
                const connectedPeer = peers.find(p => p.id === connId);
                return (
                  <div 
                    key={connId}
                    className={`p-2 rounded-md text-center peer-${connId}-bg text-white text-sm`}
                  >
                    Peer {connId}
                    <span className="block text-xs mt-1">
                      {connectedPeer?.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                );
              })}
              
              {peer.connections.length === 0 && (
                <p className="text-sm text-gray-500 col-span-4">No connections</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Wallet not activated</h3>
          <p className="text-sm text-gray-500 mb-4">
            Activate this peer to create a wallet and participate in the network.
          </p>
        </div>
      )}
    </div>
  );
};

export default PeerDetailView;
