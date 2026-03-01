import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import React from 'react';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  return <HomeScreen />;
}