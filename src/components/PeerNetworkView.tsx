
import React from 'react';
import { Peer, getWalletBalance } from '@/lib/blockchain/models';
import { Badge } from "@/components/ui/badge";

interface PeerNetworkViewProps {
  peers: Peer[];
  onPeerSelect: (peer: Peer) => void;
  selectedPeerId: number | null;
}

const PeerNetworkView: React.FC<PeerNetworkViewProps> = ({ 
  peers, 
  onPeerSelect, 
  selectedPeerId 
}) => {
  // Function to count active connections for a peer
  const countActiveConnections = (peer: Peer) => {
    return peer.connections.filter(connId => 
      peers.find(p => p.id === connId && p.isActive)
    ).length;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {peers.map((peer) => {
        const activeConnections = countActiveConnections(peer);
        
        return (
          <div 
            key={peer.id}
            onClick={() => onPeerSelect(peer)}
            className={`glass p-6 rounded-lg cursor-pointer transition-all shadow-md hover:shadow-lg
              ${selectedPeerId === peer.id ? 'ring-2 ring-primary scale-105' : 'hover:scale-102'}
              ${peer.isActive ? '' : 'opacity-70'}
            `}
          >
            <div className="flex justify-between items-center mb-4">
              <Badge className={`px-3 py-1 font-medium bg-blue-${peer.id * 100} text-white`}>
                Peer {peer.id}
              </Badge>
              <span className={`inline-flex items-center text-sm px-2 py-1 rounded-full ${peer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                <span className={`h-2 w-2 rounded-full mr-1.5 ${peer.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                {peer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="space-y-3">
              {peer.wallet && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Port:</span>
                    <span className="text-sm font-mono bg-gray-50 px-2 py-0.5 rounded">{peer.wallet.port}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Balance:</span>
                    <span className="text-sm font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded">{getWalletBalance(peer.wallet)} coins</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 block mb-1">Address:</span>
                    <span className="text-xs font-mono block bg-gray-50 p-1.5 rounded truncate">{peer.wallet.address}</span>
                  </div>
                </>
              )}
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-xs font-medium text-gray-600">Active Connections:</span>
                  <span className="text-xs font-mono">{activeConnections}</span>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-xs font-medium text-gray-600">Chain Height:</span>
                  <span className="text-xs font-mono">{peer.blockchain.length}</span>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-xs font-medium text-gray-600">Pending Tx:</span>
                  <span className="text-xs font-mono">{peer.pendingTransactions.length}</span>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-xs font-medium text-gray-600">Contracts:</span>
                  <span className="text-xs font-mono">{peer.contracts.length}</span>
                </div>
              </div>
            </div>
            
            {!peer.isActive && (
              <div className="text-center mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPeerSelect(peer);
                  }}
                  className="bg-blue-500 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Activate Peer
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PeerNetworkView;
