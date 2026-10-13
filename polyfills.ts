import 'react-native-get-random-values';
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
(global as any).Buffer = Buffer;

if (typeof process === 'undefined') {
  (global as any).process = { env: {} };
}
