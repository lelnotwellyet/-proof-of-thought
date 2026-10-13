import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Image,
  ImageBackground,
} from 'react-native';
import PixelButton from '../components/PixelButton';
import ErrorBanner from '../components/ErrorBanner';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  FadeInDown,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useWalletStore } from '../stores/walletStore';
import { styles } from './HomeScreen.styles';

export default function HomeScreen() {
  const { publicKey, connecting, connect, disconnect } = useWalletStore();
  const navigation = useNavigation<any>();
  const [connectError, setConnectError] = useState<string | null>(null);

  const buttonScale = useSharedValue(1);
  const blinkOpacity = useSharedValue(1);

  useEffect(() => {
    blinkOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      false
    );
  }, []);

  const blinkStyle = useAnimatedStyle(() => ({
    opacity: blinkOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.97, { duration: 80 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15 });
  };

  const handleConnect = async () => {
    setConnectError(null);
    await connect();
    if (!useWalletStore.getState().publicKey) {
      setConnectError('Wallet did not connect. Open Phantom or Solflare and retry.');
    }
  };

  const shortKey = publicKey
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
    : null;

  return (
    <ImageBackground
      source={require('../assets/bg-scanlines.jpg')}
      style={styles.container}
      imageStyle={{ opacity: 0.35 }}
    >
      <View style={styles.content}>
        {connectError && (
          <ErrorBanner message={connectError} onRetry={handleConnect} />
        )}

        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(0).springify()}>
          <Image
            source={require('../assets/brain-logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(100).springify()}
          style={styles.title}
        >
          Proof of Thought
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(160).springify()}
          style={styles.subtitle}
        >
          OWN YOUR IDEAS ON CHAIN
        </Animated.Text>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.divider}
        />

        {connecting ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.loadingText}>CONNECTING...</Text>
          </View>
        ) : publicKey ? (
          <Animated.View
            entering={FadeInDown.delay(240).springify()}
            style={{ width: '100%', alignItems: 'center', gap: 12 }}
          >
            {/* Connected badge */}
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>{shortKey}</Text>
              <Animated.Text style={[styles.connectedText, blinkStyle]}>
                _
              </Animated.Text>
            </View>

            {/* Write button */}
            <Animated.View style={[buttonStyle, { width: '100%' }]}>
              <PixelButton
                label="WRITE A THOUGHT"
                onPress={() => navigation.navigate('WriteThought')}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              />
            </Animated.View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>∞</Text>
                <Text style={styles.statLabel}>PERMANENT</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>SOL</Text>
                <Text style={styles.statLabel}>DEVNET</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>NFT</Text>
                <Text style={styles.statLabel}>STANDARD</Text>
              </View>
            </View>

            <PixelButton label="DISCONNECT" variant="outline" onPress={disconnect} />
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(240).springify()}
            style={{ width: '100%', alignItems: 'center', gap: 16 }}
          >
            <Text style={styles.tagline}>
              Every idea you have deserves{'\n'}to be{' '}
              <Text style={styles.taglineHighlight}>OWNED.</Text>
            </Text>

            <Animated.View style={[buttonStyle, { width: '100%' }]}>
              <PixelButton
                label="CONNECT WALLET"
                onPress={handleConnect}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              />
            </Animated.View>

            <Text style={styles.walletHint}>Requires Phantom or Solflare</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.bottomText}>⛓  BUILT ON SOLANA</Text>
    </ImageBackground>
  );
}