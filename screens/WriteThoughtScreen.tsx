import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../stores/walletStore';
import { uploadThoughtToIPFS } from '../utils/ipfs';
import { mintThoughtNFT } from '../utils/mintNft';
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import { uploadAudioToIPFS, requestMicPermission } from '../utils/audio';
import { styles } from './WriteThoughtScreen.styles';

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
  const charsUsedPercent = (thought.length / MAX_CHARS) * 100;

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
      Alert.alert('ADD A THOUGHT', 'Write something or record your voice first.');
      return;
    }
    if (!publicKey) {
      Alert.alert('NOT CONNECTED', 'Connect your wallet first.');
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
      Alert.alert('UPLOADED ✅', `Your thought is now on IPFS.\n\n${url}`);
    } catch (e) {
      Alert.alert('UPLOAD FAILED', 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleMint = async () => {
    if (!ipfsUrl || !publicKey) return;
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
        'NFT MINTED 🎉',
        `Your thought is now permanent!\n\nMint:\n${mintAddress}`,
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
      Alert.alert('MINT FAILED', 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={require('../assets/bg-scanlines.jpg')}
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.35 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backBtn}>{'< BACK'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>NEW ENTRY</Text>
            <Text style={styles.headerTime}>{timeStr}</Text>
          </View>

          {/* Input */}
          <Text style={styles.sectionLabel}>// INPUT THOUGHT</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Type your thought here..."
              placeholderTextColor="#3D2F6B"
              value={thought}
              onChangeText={(t) => t.length <= MAX_CHARS && setThought(t)}
              multiline
            />
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${charsUsedPercent}%` as any,
                    backgroundColor: charsLeft < 20 ? '#cc2200' : '#FF6B00',
                  },
                ]}
              />
            </View>
            <Text style={[styles.charCount, charsLeft < 20 && styles.charCountWarning]}>
              {charsLeft} CHARS LEFT
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Voice recording — always visible */}
          <Text style={styles.sectionLabel}>// VOICE INPUT</Text>
          <View style={styles.voiceBox}>
            <TouchableOpacity
              style={isRecording ? styles.voiceBtnStop : styles.voiceBtn}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
            >
              <Text style={styles.voiceBtnText}>
                {isRecording ? '> REC STOP_' : '> REC START_'}
              </Text>
            </TouchableOpacity>
            {isRecording && (
              <Text style={styles.recordingLabel}>● RECORDING...</Text>
            )}
            {audioUri && !isRecording && (
              <View style={styles.audioReady}>
                <Text style={styles.audioReadyText}>✓ VOICE CAPTURED</Text>
                <TouchableOpacity onPress={() => setAudioUri(null)}>
                  <Text style={styles.retakeText}>[ RETAKE ]</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Metadata */}
          <Text style={styles.sectionLabel}>// METADATA</Text>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>TIMESTAMP</Text>
              <Text style={styles.metaVal}>{now.toLocaleString()}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>AUTHOR</Text>
              <Text style={styles.metaVal}>
                {publicKey
                  ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}`
                  : 'NOT CONNECTED'}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>CHAIN</Text>
              <Text style={styles.metaVal}>SOLANA DEVNET</Text>
            </View>
          </View>

          {/* IPFS success */}
          {ipfsUrl && (
            <>
              <View style={styles.divider} />
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✓ IPFS UPLOAD OK</Text>
                <Text style={styles.successUrl} numberOfLines={2}>{ipfsUrl}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          {/* Action button */}
          <TouchableOpacity
            style={[styles.actionBtnWrapper, uploading && styles.actionBtnDisabled]}
            onPress={ipfsUrl ? handleMint : handleUpload}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF7A00', '#D45A00']}
              style={styles.actionBtnGradient}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.actionBtnText}>
                  {ipfsUrl ? '> MINT AS NFT_' : '> UPLOAD TO IPFS_'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.bottomLabel}>⛓ PROOF OF THOUGHT v1.0</Text>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}