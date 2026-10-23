import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import PixelButton from './PixelButton';
import { useWalletStore } from '../stores/walletStore';
import { registerUsername, validateUsername } from '../utils/profile';
import { colors, fonts, spacing } from '../styles/theme';

type Props = {
  visible: boolean;
  current: string | null;
  onClose: () => void;
  onSaved: (name: string) => void;
};

export default function UsernameModal({ visible, current, onClose, onSaved }: Props) {
  const connection = useWalletStore((s) => s.connection);
  const publicKey = useWalletStore((s) => s.publicKey);
  const signTransaction = useWalletStore((s) => s.signTransaction);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setNameInput(current || '');
      setNameError(null);
    }
  }, [visible]);

  const save = async () => {
    if (!publicKey) return;
    const name = nameInput.trim();
    const invalid = validateUsername(name);
    if (invalid) {
      setNameError(invalid);
      return;
    }
    setBusy(true);
    setNameError(null);
    try {
      await registerUsername({ publicKey, signTransaction }, connection, name);
      onSaved(name);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Transaction failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{current ? 'EDIT HANDLE' : 'CLAIM YOUR HANDLE'}</Text>
          <Text style={styles.hint}>
            3-16 letters, numbers or _. Names are unique and written to Solana devnet as a memo so
            every wallet can find you.
          </Text>
          <TextInput
            style={styles.input}
            value={nameInput}
            onChangeText={(t) => {
              setNameInput(t.replace(/\s/g, ''));
              setNameError(null);
            }}
            placeholder="username"
            placeholderTextColor="#6b5a3a"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={16}
            autoFocus
          />
          {nameError && <Text style={styles.error}>{nameError}</Text>}
          <PixelButton
            label={nameInput ? `SAVE @${nameInput}` : 'ENTER A NAME'}
            onPress={save}
            loading={busy}
            disabled={!!validateUsername(nameInput.trim())}
          />
          <PixelButton
            label={current ? 'CLOSE' : 'LATER'}
            variant="outline"
            style={styles.secondary}
            onPress={onClose}
            disabled={busy}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
  },
  title: { fontFamily: fonts.pixel, fontSize: 10, color: colors.white },
  hint: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    lineHeight: 11,
    color: colors.grey1,
    marginTop: spacing.sm,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  error: {
    fontFamily: fonts.pixel,
    fontSize: 6,
    lineHeight: 11,
    color: '#ffb4a8',
    marginBottom: spacing.sm,
  },
  secondary: { marginTop: spacing.md },
});
