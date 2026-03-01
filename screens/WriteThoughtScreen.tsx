import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../stores/walletStore';
import { uploadThoughtToIPFS } from '../utils/ipfs';
import { mintThoughtNFT } from '../utils/mintNft';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { uploadAudioToIPFS, requestMicPermission } from '../utils/audio';
const MAX_CHARS = 280;

export default function WriteThoughtScreen() {
  const navigation = useNavigation<any>();
  const { publicKey } = useWalletStore();
  const [thought, setThought] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioIpfsUrl, setAudioIpfsUrl] = useState<string | null>(null);

  const charsLeft = MAX_CHARS - thought.length;
const handleStartRecording = async () => {
  try {
    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert('Permission denied', 'Microphone permission is required.');
      return;
    }
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setIsRecording(true);
    setAudioUri(null);
    setAudioIpfsUrl(null);
  } catch (e) {
    Alert.alert('Recording failed', 'Could not start recording.');
  }
};

const handleStopRecording = async () => {
  try {
    await audioRecorder.stop();
    setIsRecording(false);
    const uri = audioRecorder.uri;
    if (uri) setAudioUri(uri);
  } catch (e) {
    Alert.alert('Recording failed', 'Could not stop recording.');
  }
};

  const handleUpload = async () => {
    if (!thought.trim() && !audioUri) {
      Alert.alert('Add a thought or record your voice first!');
      return;
    }
    if (!publicKey) {
      Alert.alert('Connect your wallet first!');
      return;
    }

    setUploading(true);
    try {
      let uploadedAudioUrl: string | undefined;

      if (audioUri) {
        uploadedAudioUrl = await uploadAudioToIPFS(audioUri);
        setAudioIpfsUrl(uploadedAudioUrl);
      }

      const url = await uploadThoughtToIPFS({
        name: `Proof of Thought #${Date.now()}`,
        description: 'A thought minted on Solana via Proof of Thought app',
        thought: thought.trim() || '🎙️ Voice thought',
        timestamp: new Date().toISOString(),
        author: publicKey.toString(),
        audioUri: uploadedAudioUrl,
      });
      setIpfsUrl(url);
      Alert.alert('Uploaded to IPFS! ✅', `Your thought is now on IPFS.\n\n${url}`);
    } catch (e) {
      Alert.alert('Upload failed', 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleMint = async () => {
    if (!ipfsUrl) return;
    if (!publicKey) {
      Alert.alert('Connect your wallet first!');
      return;
    }

    setUploading(true);
    try {
      const walletStore = useWalletStore.getState();
      const mintAddress = await mintThoughtNFT(
        {
          publicKey,
          signTransaction: walletStore.signTransaction,
          signAllTransactions: walletStore.signAllTransactions,
        },
        ipfsUrl,
        thought || '🎙️ Voice thought'
      );
      Alert.alert(
        'NFT Minted! 🎉',
        `Your thought is now on Solana!\n\nMint address:\n${mintAddress}`,
        [
          {
            text: 'View on Explorer',
            onPress: () =>
              Linking.openURL(
                `https://explorer.solana.com/address/${mintAddress}?cluster=devnet`
              ),
          },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]
      );
    } catch (e) {
      Alert.alert('Minting failed', 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Write Thought</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Text Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="What's on your mind? This will be minted as an NFT..."
            placeholderTextColor="#555"
            value={thought}
            onChangeText={(t) => t.length <= MAX_CHARS && setThought(t)}
            multiline
          />
          <Text style={[styles.charCount, charsLeft < 20 && styles.charCountWarning]}>
            {charsLeft} characters left
          </Text>
        </View>

        {/* Voice Recording */}
        <View style={styles.voiceContainer}>
          <Text style={styles.voiceLabel}>Or record your thought 🎙️</Text>
          {!isRecording && !audioUri && (
            <TouchableOpacity style={styles.recordButton} onPress={handleStartRecording}>
              <Text style={styles.recordButtonText}>🎙️ Start Recording</Text>
            </TouchableOpacity>
          )}
          {isRecording && (
            <TouchableOpacity style={styles.stopButton} onPress={handleStopRecording}>
              <Text style={styles.recordButtonText}>⏹️ Stop Recording</Text>
            </TouchableOpacity>
          )}
          {audioUri && !isRecording && (
            <View style={styles.audioReady}>
              <Text style={styles.audioReadyText}>🎙️ Voice recorded ✅</Text>
              <TouchableOpacity onPress={() => setAudioUri(null)}>
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Metadata preview */}
        <View style={styles.metaContainer}>
          <Text style={styles.metaLabel}>Timestamp</Text>
          <Text style={styles.metaValue}>{new Date().toLocaleString()}</Text>
          <Text style={styles.metaLabel}>Author</Text>
          <Text style={styles.metaValue}>
            {publicKey
              ? `${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-4)}`
              : 'Not connected'}
          </Text>
        </View>

        {/* IPFS URL if uploaded */}
        {ipfsUrl && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>✅ Uploaded to IPFS</Text>
            <Text style={styles.ipfsUrl}>{ipfsUrl}</Text>
          </View>
        )}

        {/* Button */}
        <TouchableOpacity
          style={[styles.button, uploading && styles.buttonDisabled]}
          onPress={ipfsUrl ? handleMint : handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {ipfsUrl ? 'Mint as NFT →' : 'Upload to IPFS'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { padding: 24, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: { color: '#9945FF', fontSize: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  inputContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  input: {
    color: '#fff',
    fontSize: 18,
    minHeight: 150,
    textAlignVertical: 'top',
    lineHeight: 28,
  },
  charCount: { color: '#555', fontSize: 12, textAlign: 'right', marginTop: 8 },
  charCountWarning: { color: '#ff6b6b' },
  voiceContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  voiceLabel: { color: '#888', fontSize: 14, marginBottom: 12 },
  recordButton: {
    backgroundColor: '#9945FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  stopButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recordButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  audioReady: { alignItems: 'center', gap: 8 },
  audioReadyText: { color: '#00ff88', fontSize: 14 },
  retakeText: { color: '#9945FF', fontSize: 13 },
  metaContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 4,
  },
  metaLabel: { color: '#555', fontSize: 11, textTransform: 'uppercase', marginTop: 8 },
  metaValue: { color: '#888', fontSize: 13, fontFamily: 'monospace' },
  successContainer: {
    backgroundColor: '#00ff8820',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  successText: { color: '#00ff88', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  ipfsUrl: { color: '#00ff88', fontSize: 11, fontFamily: 'monospace' },
  button: {
    backgroundColor: '#9945FF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});