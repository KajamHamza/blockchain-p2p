/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto-js';
import elliptic from 'elliptic';

const EC = new elliptic.ec('secp256k1');

// Generate a key pair (public and private key) using elliptic curve cryptography
export function generateKeyPair() {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate('hex');
  const publicKey = keyPair.getPublic('hex');
  
  return { publicKey, privateKey };
}

// Create a wallet address from public key (simplified)
export function generateAddress(publicKey: string): string {
  // In a real blockchain, we'd do more complex operations
  // For now, we'll just take a hash and shorten it
  return crypto.RIPEMD160(publicKey).toString().substring(0, 40);
}

// Sign a message with a private key
export function sign(message: string, privateKey: string): string {
  const hash = crypto.SHA256(message).toString();
  return crypto.HmacSHA256(hash, privateKey).toString();
}

// Verify a signature using the public key
export function verify(message: string, signature: string, publicKey: string): boolean {
  const hash = crypto.SHA256(message).toString();
  const expectedSignature = crypto.HmacSHA256(hash, publicKey).toString();
  return signature === expectedSignature;
}

// Hash a block or transaction
export function hash(data: any): string {
  return crypto.SHA256(JSON.stringify(data)).toString();
}

// Generate a Merkle Root from an array of transaction hashes
export function generateMerkleRoot(txHashes: string[]): string {
  if (txHashes.length === 0) return '';
  if (txHashes.length === 1) return txHashes[0];
  
  const newLevel: string[] = [];
  
  // If odd number of elements, duplicate the last one
  if (txHashes.length % 2 !== 0) {
    txHashes.push(txHashes[txHashes.length - 1]);
  }
  
  // Combine adjacent pairs and hash them
  for (let i = 0; i < txHashes.length; i += 2) {
    const combinedHash = crypto.SHA256(txHashes[i] + txHashes[i + 1]).toString();
    newLevel.push(combinedHash);
  }
  
  // Recursively build the tree
  return generateMerkleRoot(newLevel);
}
