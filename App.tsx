import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import React from 'react';
import { SolanaProvider } from './context/SolanaProvider';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  return (
    <SolanaProvider>
      <HomeScreen />
    </SolanaProvider>
  );
}