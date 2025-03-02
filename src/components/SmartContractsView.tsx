
import React, { useState } from 'react';
import { SmartContract, Peer, createSmartContract, createContractDeploymentTransaction } from '@/lib/blockchain/models';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SmartContractsViewProps {
  peer: Peer;
  onDeploy: (contract: SmartContract) => void;
  onExecute: (contract: SmartContract, method: string, params: any[]) => void;
}

const SmartContractsView: React.FC<SmartContractsViewProps> = ({
  peer,
  onDeploy,
  onExecute
}) => {
  const [contractName, setContractName] = useState('');
  const [contractType, setContractType] = useState<'token' | 'storage' | 'auction' | 'custom'>('token');
  const [contractCode, setContractCode] = useState('');
  
  // For contract execution
  const [selectedContract, setSelectedContract] = useState<SmartContract | null>(null);
  const [methodName, setMethodName] = useState('');
  const [methodParams, setMethodParams] = useState('');
  
  const handleDeploy = () => {
    if (!peer.wallet) {
      toast({
        title: "Error",
        description: "Wallet not activated for this peer",
        variant: "destructive"
      });
      return;
    }
    
    if (!contractName.trim()) {
      toast({
        title: "Error",
        description: "Contract name is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const contract = createSmartContract(
        contractType,
        contractName,
        contractCode,
        peer.wallet.address
      );
      
      onDeploy(contract);
      
      toast({
        title: "Success",
        description: `Contract ${contractName} deployed successfully`,
      });
      
      // Reset form
      setContractName('');
      setContractCode('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deploy contract",
        variant: "destructive"
      });
    }
  };
  
  const handleExecute = () => {
    if (!selectedContract) {
      toast({
        title: "Error",
        description: "Please select a contract",
        variant: "destructive"
      });
      return;
    }
    
    if (!methodName) {
      toast({
        title: "Error",
        description: "Method name is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Parse method parameters as array
      const params = methodParams ? JSON.parse(`[${methodParams}]`) : [];
      
      onExecute(selectedContract, methodName, params);
      
      // Reset form
      setMethodName('');
      setMethodParams('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute contract method. Check your parameters format.",
        variant: "destructive"
      });
    }
  };
  
  const getContractTypeDescription = (type: string) => {
    switch(type) {
      case 'token': return 'ERC-20 like token with transfer and balance functions';
      case 'storage': return 'Key-value storage contract';
      case 'auction': return 'Simple auction contract';
      case 'custom': return 'Custom contract with your own code';
      default: return '';
    }
  };
  
  const renderContractMethodsHint = (type: string) => {
    switch(type) {
      case 'token': 
        return 'Available methods: transfer(address,amount), balanceOf(address), totalSupply(), name(), symbol()';
      case 'storage': 
        return 'Available methods: set(key,value), get(key), addOwner(address)';
      case 'auction': 
        return 'Available methods: bid(amount), getHighestBid(), endAuction()';
      case 'custom': 
        return 'Available methods: call(funcName,...params), update(newCode)';
      default: 
        return '';
    }
  };
  
  return (
    <div className="glass rounded-lg p-6 space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold mb-4">Smart Contracts</h2>
      
      {peer.isActive && peer.wallet ? (
        <>
          <div className="space-y-4">
            <h3 className="text-md font-medium">Deployed Contracts ({peer.contracts.length})</h3>
            
            {peer.contracts.length > 0 ? (
              <div className="space-y-3">
                {peer.contracts.map((contract, index) => (
                  <div key={contract.address} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{contract.name}</span>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">{contract.type}</span>
                    </div>
                    <div className="text-xs font-mono mb-2 truncate">
                      {contract.address}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Owner: {contract.owner.substring(0, 10)}...</span>
                      <span>Deployed: {new Date(contract.deployedAt).toLocaleString()}</span>
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 w-full"
                          onClick={() => setSelectedContract(contract)}
                        >
                          Execute Methods
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Execute Contract: {contract.name}</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Method Name</Label>
                            <Input 
                              value={methodName}
                              onChange={(e) => setMethodName(e.target.value)}
                              placeholder="e.g. transfer"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Parameters (comma-separated)</Label>
                            <Input 
                              value={methodParams}
                              onChange={(e) => setMethodParams(e.target.value)}
                              placeholder='e.g. "0x123...", 100'
                            />
                            <p className="text-xs text-gray-500">
                              {renderContractMethodsHint(contract.type)}
                            </p>
                          </div>
                          
                          <Button onClick={handleExecute} className="w-full">
                            Execute
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">No contracts deployed yet</p>
              </div>
            )}
          </div>
          
          <div className="border-t pt-4">
            <h3 className="text-md font-medium mb-3">Deploy New Contract</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contractName">Contract Name</Label>
                  <Input 
                    id="contractName"
                    value={contractName}
                    onChange={(e) => setContractName(e.target.value)}
                    placeholder="MyToken"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contractType">Contract Type</Label>
                  <Select 
                    value={contractType} 
                    onValueChange={(value) => setContractType(value as any)}
                  >
                    <SelectTrigger id="contractType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="token">Token</SelectItem>
                      <SelectItem value="storage">Storage</SelectItem>
                      <SelectItem value="auction">Auction</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-1">{getContractTypeDescription(contractType)}</p>
                
                {contractType === 'custom' && (
                  <div className="mt-3">
                    <Label htmlFor="contractCode">Contract Code</Label>
                    <Textarea 
                      id="contractCode"
                      value={contractCode}
                      onChange={(e) => setContractCode(e.target.value)}
                      placeholder="// Your contract code here"
                      rows={5}
                    />
                  </div>
                )}
              </div>
              
              <Button onClick={handleDeploy} className="w-full">
                Deploy Contract
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Wallet not activated</h3>
          <p className="text-sm text-gray-500 mb-4">
            Activate this peer to create a wallet and deploy contracts.
          </p>
        </div>
      )}
    </div>
  );
};

export default SmartContractsView;
