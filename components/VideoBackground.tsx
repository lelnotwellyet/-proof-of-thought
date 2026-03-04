import React, { useEffect, useRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');
const DRIFT_AMOUNT = 18;
const PARALLAX_DIVIDER = 10;

export default function VideoBackground() {
  const videoRef = useRef(null);

  // Idle drift
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);

  // Touch parallax offset
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);

  // Breathing scale
  const scale = useSharedValue(1.02);

  useEffect(() => {
    // Slow diagonal drift — 40 second loop
    driftX.value = withRepeat(
      withTiming(DRIFT_AMOUNT, {
        duration: 40000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    driftY.value = withRepeat(
      withTiming(DRIFT_AMOUNT * 0.6, {
        duration: 50000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    // Subtle breathing zoom
    scale.value = withRepeat(
      withTiming(1.06, {
        duration: 8000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, []);

  // Touch parallax gesture
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      touchX.value = e.translationX / PARALLAX_DIVIDER;
      touchY.value = e.translationY / PARALLAX_DIVIDER;
    })
    .onEnd(() => {
      touchX.value = withSpring(0, { damping: 20, stiffness: 80 });
      touchY.value = withSpring(0, { damping: 20, stiffness: 80 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: driftX.value + touchX.value },
      { translateY: driftY.value + touchY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.container]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
          <Video
            ref={videoRef}
            source={require('../assets/bg-video.mp4')}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
            useNativeControls={false}
          />
        </Animated.View>

        {/* Dark overlay for readability */}
        <Animated.View style={styles.overlay} />

        {/* Scanline overlay for retro feel */}
        <Animated.View style={styles.scanlines} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 0,
    overflow: 'hidden',
  },
  video: {
    width: width + DRIFT_AMOUNT * 4,
    height: height + DRIFT_AMOUNT * 4,
    marginLeft: -DRIFT_AMOUNT * 2,
    marginTop: -DRIFT_AMOUNT * 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 10, 30, 0.52)',
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: undefined,
    opacity: 0.04,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
});