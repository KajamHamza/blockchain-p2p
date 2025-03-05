
import React from 'react';
import { Transaction } from '@/lib/blockchain/models';

interface PendingTransactionsViewProps {
  transactions: Transaction[];
}

const PendingTransactionsView: React.FC<PendingTransactionsViewProps> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <div className="glass rounded-lg p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">No Pending Transactions</h2>
        <p className="text-gray-500">Once transactions are created, they'll appear here until mined</p>
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
      <h2 className="text-lg font-semibold mb-4">Pending Transactions ({transactions.length})</h2>
      
      <div className="space-y-2">
        {transactions.map((tx, index) => (
          <div key={tx.id} className="bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs font-mono truncate max-w-[150px]">
                {tx.id}
              </div>
              
              <div className="text-xs text-gray-500">
                {new Date(tx.timestamp).toLocaleTimeString()}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium">{tx.type === 'coinbase' ? 'Coinbase' : 'Transfer'}</span>
                <span className="text-gray-500 ml-2">
                  {tx.type === 'coinbase' 
                    ? `to ${tx.outputs[0].address.substring(0, 6)}...` 
                    : `${tx.inputs.length} input(s), ${tx.outputs.length} output(s)`}
                </span>
              </div>
              
              <div className="text-sm">
                {getTransactionAmount(tx)} coins
              </div>
            </div>
            
            {tx.type === 'contract' && (
              <div className="mt-2 text-xs bg-gray-100 p-1 rounded">
                <span className="font-medium">Contract Method:</span> {tx.contractData?.method}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingTransactionsView;