import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useWalletStore } from '../stores/walletStore';
import WriteThoughtScreen from './WriteThoughtScreen';

export default function HomeScreen() {
  const { publicKey, connecting, connect, disconnect } = useWalletStore();
  const [showWrite, setShowWrite] = useState(false);

  const shortKey = publicKey
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
    : null;

  if (showWrite) {
    return <WriteThoughtScreen onBack={() => setShowWrite(false)} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proof of Thought</Text>
      <Text style={styles.subtitle}>Own your ideas on chain</Text>

      {connecting ? (
        <ActivityIndicator size="large" color="#9945FF" />
      ) : publicKey ? (
        <View style={styles.connectedContainer}>
          <Text style={styles.connectedText}>Connected: {shortKey}</Text>
          <TouchableOpacity
            style={styles.writeButton}
            onPress={() => setShowWrite(true)}
          >
            <Text style={styles.buttonText}>✍️ Write a Thought</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.connectButton} onPress={connect}>
          <Text style={styles.buttonText}>Connect Wallet</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888888', marginBottom: 48 },
  connectButton: {
    backgroundColor: '#9945FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  writeButton: {
    backgroundColor: '#9945FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  disconnectButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  disconnectText: { color: '#666', fontSize: 14 },
  connectedContainer: { alignItems: 'center' },
  connectedText: { color: '#00ff88', fontSize: 14, marginBottom: 24 },
});