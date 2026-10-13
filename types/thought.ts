export interface ThoughtData {
  mintAddress: string;
  name: string;
  thought: string;
  timestamp: string;
  author: string;
  audioUri?: string;
  contentHash?: string;
  isVerified?: boolean;
  registryPda?: string;
  priceSol?: number;
  isForSale?: boolean;
  sellerAddress?: string;
  currentOwner?: string;
}
