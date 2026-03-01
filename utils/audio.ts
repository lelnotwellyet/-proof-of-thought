import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIyZWEyMzQxNS0zODc1LTRlNjEtYTJiNS1iZjNkYjFiMGU3MTIiLCJlbWFpbCI6ImxhbG1vaGFtbWFkcGF0ZWwxMUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiMGM3MmU2OGE4NWFjZmE5ZjljNjUiLCJzY29wZWRLZXlTZWNyZXQiOiIzYzBjNjYwN2YwYmNjMjY0MWE3ODBlYTM3ZmJiYWM3MTNkNDllYzE0MGVhNGYyMTNmYTM4MTUxMmRkNDgxODE5IiwiZXhwIjoxODAzOTE2MTYyfQ.dZQWivsNfLb9SH7ZnbFLnvZRZ3qeohRtOY7InVEhZtY';

export const requestMicPermission = async (): Promise<boolean> => {
  const status = await AudioModule.requestRecordingPermissionsAsync();
  return status.granted;
};

export const uploadAudioToIPFS = async (uri: string): Promise<string> => {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) throw new Error('Audio file not found');

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'audio/m4a',
    name: `thought-${Date.now()}.m4a`,
  } as any);

  formData.append(
    'pinataMetadata',
    JSON.stringify({ name: `proof-of-thought-audio-${Date.now()}` })
  );

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
};