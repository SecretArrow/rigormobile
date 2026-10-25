/** Jest config for the Android app — basic stub. */
module.exports = {
  preset: 'react-native',
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|expo|@rigormobile)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
