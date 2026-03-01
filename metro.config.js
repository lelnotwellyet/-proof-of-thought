const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-get-random-values'),
  stream: require.resolve('stream-browserify'),
  url: require.resolve('url'),
  buffer: require.resolve('buffer'),
};

module.exports = config;