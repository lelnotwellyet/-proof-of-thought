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
import { styles } from './WriteThoughtScreen.styles';

const MAX_CHARS = 280;
const MIN_CHARS = 3;

/** Returns an error message, or null when the thought can be uploaded and minted. */
export function validateThought(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Write something first.';
  if (trimmed.length < MIN_CHARS) return `A thought needs at least ${MIN_CHARS} characters.`;
  if (trimmed.length > MAX_CHARS) return `Keep it under ${MAX_CHARS} characters.`;
  // Must contain at least one letter or number, not just spaces/symbols.
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return 'Use at least one letter or number.';
  return null;
}

export default function WriteThoughtScreen() {
  const navigation = useNavigation<any>();
  const { publicKey } = useWalletStore();
  const [thought, setThought] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ipfsUrl, setIpfsUrl] = useState<string | null>(null);
  // The exact text that went to IPFS; minting is only allowed for that text.
  const [uploadedText, setUploadedText] = useState<string | null>(null);
  const [minted, setMinted] = useState(false);
  const validationError = validateThought(thought);

  const charsLeft = MAX_CHARS - thought.length;
  const charsUsedPercent = (thought.length / MAX_CHARS) * 100;

  const handleUpload = async () => {
    if (validationError) {
      Alert.alert('INVALID THOUGHT', validationError);
      return;
    }
    if (!publicKey) {
      Alert.alert('NOT CONNECTED', 'Connect your wallet first.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadThoughtToIPFS({
        name: `Proof of Thought #${Date.now()}`,
        description: 'A thought minted on Solana via Proof of Thought app',
        thought: thought.trim(),
        timestamp: new Date().toISOString(),
        author: publicKey.toString(),
      });
      setIpfsUrl(url);
      setUploadedText(thought.trim());
      Alert.alert('UPLOADED ✅', `Your thought is now on IPFS.\n\n${url}`);
    } catch (e) {
      Alert.alert('UPLOAD FAILED', 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleMint = async () => {
    if (!publicKey) {
      Alert.alert('NOT CONNECTED', 'Connect your wallet first.');
      return;
    }
    if (minted) return;
    if (!ipfsUrl || uploadedText === null || uploadedText !== thought.trim()) {
      Alert.alert('UPLOAD FIRST', 'Upload this exact thought to IPFS before minting.');
      return;
    }
    if (validateThought(uploadedText)) {
      Alert.alert('INVALID THOUGHT', validateThought(uploadedText)!);
      return;
    }
    setUploading(true);
    try {
      const walletStore = useWalletStore.getState();
      const walletAdapter = {
        publicKey,
        signTransaction: walletStore.signTransaction,
        signAllTransactions: walletStore.signAllTransactions,
      };
      const mintAddress = await mintThoughtNFT(walletAdapter, ipfsUrl, uploadedText);
      setMinted(true);
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
              editable={!minted && !uploading}
              onChangeText={(t) => {
                if (t.length > MAX_CHARS) return;
                setThought(t);
                // Editing after upload invalidates the IPFS copy.
                if (ipfsUrl && t.trim() !== uploadedText) {
                  setIpfsUrl(null);
                  setUploadedText(null);
                }
              }}
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
            {thought.length > 0 && validationError && (
              <Text style={[styles.charCount, styles.charCountWarning]}>{validationError.toUpperCase()}</Text>
            )}
            <Text style={[styles.charCount, charsLeft < 20 && styles.charCountWarning]}>
              {charsLeft} CHARS LEFT
            </Text>
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
            style={[styles.actionBtnWrapper, (uploading || minted || !!validationError) && styles.actionBtnDisabled]}
            onPress={ipfsUrl ? handleMint : handleUpload}
            disabled={uploading || minted || !!validationError}
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
                  {minted ? '✓ MINTED' : ipfsUrl ? '> MINT AS NFT_' : '> UPLOAD TO IPFS_'}
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