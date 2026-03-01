import axios from 'axios';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyZWEyMzQxNS0zODc1LTRlNjEtYTJiNS1iZjNkYjFiMGU3MTIiLCJlbWFpbCI6ImxhbG1vaGFtbWFkcGF0ZWwxMUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMGM3MmU2OGE4NWFjZmE5ZjljNjUiLCJzY29wZWRLZXlTZWNyZXQiOiIzYzBjNjYwN2YwYmNjMjY0MWE3ODBlYTM3ZmJiYWM3MTNkNDllYzE0MGVhNGYyMTNmYTM4MTUxMmRkNDgxODE5IiwiZXhwIjoxODAzOTE2MTYyfQ.dZQWivsNfLb9SH7ZnbFLnvZRZ3qeohRtOY7InVEhZtY';

export interface ThoughtMetadata {
  name: string;
  description: string;
  thought: string;
  timestamp: string;
  author: string;
}

export const uploadThoughtToIPFS = async (metadata: ThoughtMetadata): Promise<string> => {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: `proof-of-thought-${Date.now()}`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
  } catch (e) {
    console.error('IPFS upload failed:', e);
    throw e;
  }
};