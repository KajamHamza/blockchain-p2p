
import React, { useState } from 'react';
import { Block, Transaction } from '@/lib/blockchain/models';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

interface BlockchainViewProps {
  blockchain: Block[];
}

const BlockchainView: React.FC<BlockchainViewProps> = ({ blockchain }) => {
  const [expandedBlockIndex, setExpandedBlockIndex] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const toggleBlock = (index: number) => {
    if (expandedBlockIndex === index) {
      setExpandedBlockIndex(null);
    } else {
      setExpandedBlockIndex(index);
    }
  };
  
  return (
    <div className="glass rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">Blockchain Explorer</h2>
      
      <div className="space-y-4">
        {blockchain.map((block, index) => (
          <div 
            key={block.hash}
            className={`border border-gray-200 rounded-lg transition-all ${
              index === blockchain.length - 1 ? 'bg-blue-50 border-blue-200' : ''
            }`}
          >
            <div 
              className="p-4 cursor-pointer flex items-center justify-between"
              onClick={() => toggleBlock(index)}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                  {index}
                </div>
                <div>
                  <h3 className="font-medium">Block #{block.index}</h3>
                  <p className="text-xs text-gray-500">{new Date(block.timestamp).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm">
                  <span className="text-gray-500">Transactions:</span> {block.transactions.length}
                </div>
                
                <div className="text-xs text-gray-500 truncate" style={{ maxWidth: '150px' }}>
                  {block.hash.substring(0, 10)}...
                </div>
              </div>
            </div>
            
            {expandedBlockIndex === index && (
              <div className="p-4 border-t border-gray-200 animate-slide-down">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Previous Hash</h4>
                    <p className="text-xs font-mono break-all bg-gray-50 p-2 rounded-md">
                      {block.previousHash || 'Genesis Block'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Merkle Root</h4>
                    <p className="text-xs font-mono break-all bg-gray-50 p-2 rounded-md">
                      {block.merkleRoot}
                    </p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Hash</h4>
                  <p className="text-xs font-mono break-all bg-gray-50 p-2 rounded-md">
                    {block.hash}
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Nonce</h4>
                    <p className="text-sm">{block.nonce}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Difficulty</h4>
                    <p className="text-sm">{block.difficulty}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Miner</h4>
                    <p className="text-sm truncate font-mono">{block.miner.substring(0, 8)}...</p>
                  </div>
                </div>
                
                <h4 className="text-sm font-medium mb-2">Transactions</h4>
                <div className="space-y-2">
                  {block.transactions.map((tx) => (
                    <Dialog key={tx.id}>
                      <DialogTrigger asChild>
                        <div 
                          className="bg-white border border-gray-200 rounded-md p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setSelectedTransaction(tx)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start">
                              <div className={`rounded-full w-2 h-2 mt-1 mr-2 ${tx.type === 'coinbase' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                              <div>
                                <div className="text-sm font-medium">
                                  {tx.type === 'coinbase' ? 'Coinbase (Mining Reward)' : `Transaction`}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {tx.id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-sm">
                              {tx.outputs.reduce((sum, output) => sum + output.amount, 0)} coins
                            </div>
                          </div>
                        </div>
                      </DialogTrigger>
                      
                      <DialogContent className="min-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>
                            {tx.type === 'coinbase' ? 'Coinbase Transaction' : 'Transaction Details'}
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="mt-4">
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Transaction ID</h4>
                            <p className="text-sm font-mono break-all bg-gray-50 p-2 rounded-md">
                              {tx.id}
                            </p>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Timestamp</h4>
                            <p className="text-sm">
                              {new Date(tx.timestamp).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Type</h4>
                            <p className="text-sm capitalize">
                              {tx.type}
                            </p>
                          </div>
                          
                          {tx.type !== 'coinbase' && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-500 mb-1">Inputs</h4>
                              <div className="space-y-2">
                                {tx.inputs.map((input, i) => (
                                  <div key={i} className="bg-gray-50 p-2 rounded-md">
                                    <div className="text-xs">
                                      <span className="font-medium">From TX: </span>
                                      <span className="font-mono">{input.txId.substring(0, 10)}...</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-medium">Output Index: </span>
                                      <span>{input.outputIndex}</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-medium">Public Key: </span>
                                      <span className="font-mono">{input.publicKey.substring(0, 10)}...</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="mb-2">
                            <h4 className="text-sm font-medium text-gray-500 mb-1">Outputs</h4>
                            <div className="space-y-2">
                              {tx.outputs.map((output, i) => (
                                <div key={i} className="bg-gray-50 p-2 rounded-md">
                                  <div className="flex justify-between items-center">
                                    <div className="text-xs font-mono truncate max-w-[300px]">
                                      {output.address}
                                    </div>
                                    <div className="text-sm font-medium">
                                      {output.amount} coins
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BlockchainView;
