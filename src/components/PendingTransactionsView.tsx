
import React from 'react';
import { Transaction } from '@/lib/blockchain/models';

interface PendingTransactionsViewProps {
  transactions: Transaction[];
}

const PendingTransactionsView: React.FC<PendingTransactionsViewProps> = ({ 
  transactions 
}) => {
  if (transactions.length === 0) {
    return (
      <div className="glass rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-3">Pending Transactions</h2>
        <p className="text-gray-500">No pending transactions</p>
      </div>
    );
  }
  
  // Helper function to get the actual transfer amount (excluding change back to sender)
  const getTransactionAmount = (tx: Transaction): number => {
    if (tx.type === 'coinbase') {
      return tx.outputs[0].amount;
    }
    
    // For regular transactions, the first output is typically the payment to recipient
    // (excluding change that goes back to sender)
    return tx.outputs[0].amount;
  };
  
  return (
    <div className="glass rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Pending Transactions</h2>
        <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {transactions.length} pending
        </span>
      </div>
      
      <div className="space-y-3">
        {transactions.map((tx) => (
          <div 
            key={tx.id}
            className="bg-white border border-yellow-100 rounded-md p-3 hover:bg-yellow-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  Transaction
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {tx.id.substring(0, 10)}...
                </div>
              </div>
              
              <div className="text-sm">
                {getTransactionAmount(tx)} coins
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-100 text-xs flex justify-between">
              <div>
                <span className="text-gray-500">From:</span> {tx.inputs.length > 0 ? 
                  tx.inputs[0].publicKey.substring(0, 8) + '...' : 'Coinbase'}
              </div>
              <div>
                <span className="text-gray-500">To:</span> {tx.outputs[0].address.substring(0, 8)}...
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Status:</span>
          <span className="text-yellow-500 flex items-center">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse"></span>
            Waiting to be mined
          </span>
        </div>
      </div>
    </div>
  );
};

export default PendingTransactionsView;
