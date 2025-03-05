/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
import { hash, generateMerkleRoot, sign, verify } from './crypto';

export interface UTXO {
  txId: string;
  outputIndex: number;
  address: string;
  amount: number;
}

export interface TxInput {
  txId: string;
  outputIndex: number;
  signature: string;
  publicKey: string;
}

export interface TxOutput {
  address: string;
  amount: number;
}

export interface Transaction {
  id: string;
  inputs: TxInput[];
  outputs: TxOutput[];
  timestamp: number;
  type: 'regular' | 'coinbase' | 'contract';
  contractData?: {
    code: string;
    method: string;
    params: any[];
  };
}

export interface Block {
  index: number;
  timestamp: number;
  transactions: Transaction[];
  previousHash: string;
  hash: string;
  nonce: number;
  merkleRoot: string;
  miner: string;
  difficulty: number;
}

export interface SmartContract {
  address: string;
  code: string;
  state: any;
  owner: string;
  name: string;
  type: 'token' | 'storage' | 'auction' | 'custom';
  deployedAt: number;
}

export interface Wallet {
  publicKey: string;
  privateKey: string;
  address: string;
  utxos: UTXO[];
  port: number;
}

export interface Peer {
  id: number;
  wallet: Wallet | null;
  isActive: boolean;
  blockchain: Block[];
  pendingTransactions: Transaction[];
  contracts: SmartContract[];
  connections: number[];
}

export function createTransaction(
  senderWallet: Wallet,
  recipientAddress: string,
  amount: number,
  utxoSet: UTXO[]
): Transaction | null {
  let inputSum = 0;
  const selectedUtxos: UTXO[] = [];
  
  const sortedUtxos = [...utxoSet].sort((a, b) => a.amount - b.amount);
  
  for (const utxo of sortedUtxos) {
    if (utxo.address === senderWallet.address) {
      selectedUtxos.push(utxo);
      inputSum += utxo.amount;
      if (inputSum >= amount) break;
    }
  }
  
  if (inputSum < amount) {
    return null;
  }
  
  const inputs: TxInput[] = selectedUtxos.map(utxo => {
    const message = `${utxo.txId}${utxo.outputIndex}${recipientAddress}${amount}`;
    const signature = sign(message, senderWallet.privateKey);
    
    return {
      txId: utxo.txId,
      outputIndex: utxo.outputIndex,
      signature,
      publicKey: senderWallet.publicKey
    };
  });
  
  const outputs: TxOutput[] = [
    {
      address: recipientAddress,
      amount
    }
  ];
  
  const change = inputSum - amount;
  if (change > 0) {
    outputs.push({
      address: senderWallet.address,
      amount: change
    });
  }
  
  const transaction: Transaction = {
    id: '',
    inputs,
    outputs,
    timestamp: Date.now(),
    type: 'regular'
  };
  
  transaction.id = hash(JSON.stringify(transaction));
  
  return transaction;
}

export function verifyTransaction(transaction: Transaction, utxoSet: UTXO[]): boolean {
  if (transaction.type === 'coinbase') {
    return transaction.inputs.length === 0;
  }
  
  for (const input of transaction.inputs) {
    const utxo = utxoSet.find(u => 
      u.txId === input.txId && u.outputIndex === input.outputIndex
    );
    
    if (!utxo) return false;
    
    const recipientOutput = transaction.outputs[0];
    const message = `${input.txId}${input.outputIndex}${recipientOutput.address}${recipientOutput.amount}`;
    
    if (!verify(message, input.signature, input.publicKey)) {
      return false;
    }
  }
  
  const inputSum = transaction.inputs.reduce((sum, input) => {
    const utxo = utxoSet.find(u => 
      u.txId === input.txId && u.outputIndex === input.outputIndex
    );
    return sum + (utxo ? utxo.amount : 0);
  }, 0);
  
  const outputSum = transaction.outputs.reduce((sum, output) => 
    sum + output.amount, 0
  );
  
  return inputSum >= outputSum;
}

export function createBlock(
  index: number,
  previousHash: string,
  transactions: Transaction[],
  difficulty: number,
  minerAddress: string
): Block {
  const txHashes = transactions.map(tx => tx.id);
  const merkleRoot = generateMerkleRoot(txHashes);
  
  const block: Block = {
    index,
    timestamp: Date.now(),
    transactions,
    previousHash,
    hash: '',
    nonce: 0,
    merkleRoot,
    miner: minerAddress,
    difficulty
  };
  
  while (!isValidBlockHash(block, difficulty)) {
    block.nonce++;
    block.hash = calculateBlockHash(block);
  }
  
  return block;
}

export function calculateBlockHash(block: Block): string {
  const { hash: blockHash, ...blockWithoutHash } = block;
  return hash(JSON.stringify(blockWithoutHash));
}

export function isValidBlockHash(block: Block, difficulty: number): boolean {
  const hash = calculateBlockHash(block);
  const prefix = '0'.repeat(difficulty);
  return hash.startsWith(prefix);
}

export function verifyBlock(block: Block, previousBlock: Block | null, difficulty: number): boolean {
  if (previousBlock && block.index !== previousBlock.index + 1) {
    return false;
  }
  
  if (previousBlock && block.previousHash !== previousBlock.hash) {
    return false;
  }
  
  if (block.hash !== calculateBlockHash(block)) {
    return false;
  }
  
  if (!isValidBlockHash(block, difficulty)) {
    return false;
  }
  
  const txHashes = block.transactions.map(tx => tx.id);
  if (block.merkleRoot !== generateMerkleRoot(txHashes)) {
    return false;
  }
  
  return true;
}

export function createCoinbaseTransaction(minerAddress: string, reward: number): Transaction {
  return {
    id: hash(`coinbase-${Date.now()}-${minerAddress}`),
    inputs: [],
    outputs: [{ address: minerAddress, amount: reward }],
    timestamp: Date.now(),
    type: 'coinbase'
  };
}

export function executeSmartContract(
  contract: SmartContract, 
  method: string, 
  params: any[],
  sender: string
): any {
  switch(contract.type) {
    case 'token':
      return executeTokenContract(contract, method, params, sender);
    case 'storage':
      return executeStorageContract(contract, method, params, sender);
    case 'auction':
      return executeAuctionContract(contract, method, params, sender);
    case 'custom':
      return executeCustomContract(contract, method, params, sender);
    default:
      return { error: 'Contract type not supported' };
  }
}

function executeTokenContract(contract: SmartContract, method: string, params: any[], sender: string): any {
  if (!contract.state.balances) {
    contract.state.balances = {};
    contract.state.balances[contract.owner] = 1000;
    contract.state.totalSupply = 1000;
    contract.state.name = contract.name || "Token";
    contract.state.symbol = "TKN";
  }
  
  switch (method) {
    case 'transfer':
      const [to, amount] = params;
      if (!contract.state.balances[sender] || contract.state.balances[sender] < amount) {
        return { error: 'Insufficient balance' };
      }
      
      contract.state.balances[sender] -= amount;
      contract.state.balances[to] = (contract.state.balances[to] || 0) + amount;
      return { success: true, newBalance: contract.state.balances[sender] };
      
    case 'balanceOf':
      const [address] = params;
      return { balance: contract.state.balances[address] || 0 };
      
    case 'totalSupply':
      return { totalSupply: contract.state.totalSupply };
      
    case 'name':
      return { name: contract.state.name };
      
    case 'symbol':
      return { symbol: contract.state.symbol };
      
    default:
      return { error: 'Method not found' };
  }
}

function executeStorageContract(contract: SmartContract, method: string, params: any[], sender: string): any {
  if (!contract.state.storage) {
    contract.state.storage = {};
    contract.state.owners = { [contract.owner]: true };
  }
  
  switch (method) {
    case 'set':
      const [key, value] = params;
      if (!contract.state.owners[sender]) {
        return { error: 'Not authorized' };
      }
      
      contract.state.storage[key] = value;
      return { success: true, key, value };
      
    case 'get':
      const [queryKey] = params;
      return { value: contract.state.storage[queryKey] };
      
    case 'addOwner':
      const [newOwner] = params;
      if (!contract.state.owners[sender]) {
        return { error: 'Not authorized' };
      }
      
      contract.state.owners[newOwner] = true;
      return { success: true, newOwner };
      
    default:
      return { error: 'Method not found' };
  }
}

function executeAuctionContract(contract: SmartContract, method: string, params: any[], sender: string): any {
  if (!contract.state.item) {
    contract.state.item = "Default Item";
    contract.state.highestBid = 0;
    contract.state.highestBidder = null;
    contract.state.endTime = Date.now() + 86400000;
    contract.state.ended = false;
    contract.state.bids = {};
  }
  
  switch (method) {
    case 'bid':
      const [amount] = params;
      
      if (contract.state.ended || Date.now() > contract.state.endTime) {
        contract.state.ended = true;
        return { error: 'Auction ended' };
      }
      
      if (amount <= contract.state.highestBid) {
        return { error: 'Bid too low' };
      }
      
      if (contract.state.highestBidder) {
        contract.state.bids[contract.state.highestBidder] = 0;
      }
      
      contract.state.highestBid = amount;
      contract.state.highestBidder = sender;
      contract.state.bids[sender] = amount;
      
      return { 
        success: true, 
        amount, 
        highestBid: contract.state.highestBid 
      };
      
    case 'getHighestBid':
      return { 
        highestBid: contract.state.highestBid,
        highestBidder: contract.state.highestBidder,
        ended: contract.state.ended || Date.now() > contract.state.endTime
      };
      
    case 'endAuction':
      if (sender !== contract.owner) {
        return { error: 'Not authorized' };
      }
      
      if (contract.state.ended) {
        return { error: 'Auction already ended' };
      }
      
      contract.state.ended = true;
      
      return { 
        success: true, 
        winner: contract.state.highestBidder, 
        amount: contract.state.highestBid 
      };
      
    default:
      return { error: 'Method not found' };
  }
}

function executeCustomContract(contract: SmartContract, method: string, params: any[], sender: string): any {
  if (!contract.state.initialized) {
    contract.state.initialized = true;
    contract.state.owner = contract.owner;
    contract.state.data = {};
  }
  
  try {
    switch (method) {
      case 'call':
        const [funcName, ...funcParams] = params;
        return { 
          success: true,
          result: `Called ${funcName} with params: ${funcParams.join(', ')}`,
          sender
        };
        
      case 'update':
        if (sender !== contract.state.owner) {
          return { error: 'Not authorized' };
        }
        
        const [newCode] = params;
        contract.code = newCode;
        return { success: true };
        
      default:
        return { error: 'Method not found' };
    }
  } catch (error) {
    return { error: 'Execution error', details: JSON.stringify(error) };
  }
}

export function createSmartContract(
  type: 'token' | 'storage' | 'auction' | 'custom',
  name: string,
  code: string,
  owner: string
): SmartContract {
  return {
    address: hash(`contract-${Date.now()}-${owner}-${name}`),
    code,
    state: {},
    owner,
    name,
    type,
    deployedAt: Date.now()
  };
}

export function createContractDeploymentTransaction(
  senderWallet: Wallet,
  contract: SmartContract,
  fee: number,
  utxoSet: UTXO[]
): Transaction | null {
  let inputSum = 0;
  const selectedUtxos: UTXO[] = [];
  
  for (const utxo of utxoSet) {
    if (utxo.address === senderWallet.address) {
      selectedUtxos.push(utxo);
      inputSum += utxo.amount;
      if (inputSum >= fee) break;
    }
  }
  
  if (inputSum < fee) {
    return null;
  }
  
  const inputs: TxInput[] = selectedUtxos.map(utxo => {
    const message = `${utxo.txId}${utxo.outputIndex}${contract.address}${fee}`;
    const signature = sign(message, senderWallet.privateKey);
    
    return {
      txId: utxo.txId,
      outputIndex: utxo.outputIndex,
      signature,
      publicKey: senderWallet.publicKey
    };
  });
  
  const outputs: TxOutput[] = [];
  
  const change = inputSum - fee;
  if (change > 0) {
    outputs.push({
      address: senderWallet.address,
      amount: change
    });
  }
  
  const transaction: Transaction = {
    id: '',
    inputs,
    outputs,
    timestamp: Date.now(),
    type: 'contract',
    contractData: {
      code: contract.code,
      method: 'deploy',
      params: [contract.type, contract.name, contract.owner]
    }
  };
  
  transaction.id = hash(JSON.stringify(transaction));
  
  return transaction;
}

export function createGenesisBlock(): Block {
  const coinbase = createCoinbaseTransaction('genesis', 50);
  
  return {
    index: 0,
    timestamp: Date.now(),
    transactions: [coinbase],
    previousHash: '0',
    hash: '',
    nonce: 0,
    merkleRoot: generateMerkleRoot([coinbase.id]),
    miner: 'genesis',
    difficulty: 2
  };
}

export function finalizeGenesisBlock(block: Block): Block {
  block.hash = calculateBlockHash(block);
  return block;
}

export function getWalletBalance(wallet: Wallet): number {
  return wallet.utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
}