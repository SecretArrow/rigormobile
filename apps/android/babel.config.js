/** Babel config for the Expo RN app. */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for `react-native-paper` tree-shaking
      'react-native-reanimated/plugin',
    ],
  };
};
