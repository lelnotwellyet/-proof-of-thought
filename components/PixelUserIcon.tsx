import React from 'react';
import { View } from 'react-native';

// 7x7 pixel-art bust: head on top, shoulders below.
const GRID = [
  '..###..',
  '.#####.',
  '.#####.',
  '..###..',
  '.......',
  '.#####.',
  '#######',
];

export default function PixelUserIcon({ color, size = 24 }: { color: string; size?: number }) {
  const px = Math.floor(size / GRID.length);
  return (
    <View style={{ width: px * GRID.length, height: px * GRID.length }}>
      {GRID.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {row.split('').map((cell, x) => (
            <View
              key={x}
              style={{ width: px, height: px, backgroundColor: cell === '#' ? color : 'transparent' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
