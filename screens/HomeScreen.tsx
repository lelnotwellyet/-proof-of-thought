import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Image,
} from 'react-native';
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

  const buttonScale = useSharedValue(1);
  const logoScale = useSharedValue(1);

  useEffect(() => {
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.97, { duration: 80 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15 });
  };

  const shortKey = publicKey
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
    : null;

  return (
    <ImageBackground
      source={require('../assets/bg-scanlines.jpg')}
      style={styles.container}
      imageStyle={{ opacity: 0.4 }}
    >
      <View style={styles.content}>

        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(0).springify()} style={logoStyle}>
          <Image
            source={require('../assets/brain-logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Animated.Text entering={FadeInDown.delay(80).springify()} style={styles.title}>
          Proof of Thought
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(140).springify()} style={styles.subtitle}>
          OWN YOUR IDEAS ON CHAIN
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.divider} />

        {connecting ? (
          <Animated.View entering={FadeInDown.springify()} style={{ alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.loadingText}>CONNECTING...</Text>
          </Animated.View>
        ) : publicKey ? (
          <Animated.View
            entering={FadeInDown.delay(220).springify()}
            style={{ width: '100%', alignItems: 'center' }}
          >
            {/* Connected badge */}
            <View style={styles.connectedBadge}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>{shortKey}</Text>
            </View>

            {/* Write button */}
            <Animated.View style={[buttonStyle, { width: '100%' }]}>
              <TouchableOpacity
                style={styles.writeButton}
                onPress={() => navigation.navigate('WriteThought')}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
              >
                <Text style={styles.writeButtonText}>✍️  WRITE A THOUGHT</Text>
              </TouchableOpacity>
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

            <TouchableOpacity style={styles.disconnectButton} onPress={disconnect}>
              <Text style={styles.disconnectText}>DISCONNECT</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(220).springify()}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <Text style={styles.tagline}>
              Every idea you have deserves to be{'\n'}
              <Text style={styles.taglineHighlight}>OWNED.</Text>
            </Text>

            <Animated.View style={[buttonStyle, { width: '100%' }]}>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={connect}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
              >
                <Text style={styles.connectButtonText}>🔗  CONNECT WALLET</Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.walletHint}>REQUIRES PHANTOM OR SOLFLARE</Text>
          </Animated.View>
        )}
      </View>

      <Text style={styles.bottomText}>⛓  BUILT ON SOLANA</Text>
    </ImageBackground>
  );
}