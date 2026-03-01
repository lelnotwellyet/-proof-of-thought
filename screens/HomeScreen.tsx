import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSolana } from '../context/SolanaProvider';

export default function HomeScreen() {
  const { publicKey, connecting, connect, disconnect } = useSolana();

  const shortKey = publicKey
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proof of Thought</Text>
      <Text style={styles.subtitle}>Own your ideas on chain</Text>

      {connecting ? (
        <ActivityIndicator size="large" color="#9945FF" />
      ) : publicKey ? (
        <View style={styles.connectedContainer}>
          <Text style={styles.connectedText}>Connected: {shortKey}</Text>
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
            <Text style={styles.buttonText}>Disconnect</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 48,
  },
  connectButton: {
    backgroundColor: '#9945FF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  disconnectButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    alignItems: 'center',
  },
  connectedText: {
    color: '#00ff88',
    fontSize: 14,
    marginBottom: 8,
  },
});