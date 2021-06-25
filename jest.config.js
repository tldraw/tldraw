module.exports = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['node_modules', '.next'],
  transformIgnorePatterns: ['node_modules/(?!(sucrase|browser-fs-access)/)'],
  transform: {
    '^.+\\.(ts|tsx|mjs)$': 'babel-jest',
  },
  modulePaths: ['<rootDir>', 'node_modules'],
  testMatch: ['**/__tests__/**/*test.[t]s?(x)'],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/__mocks__/fileMock.js',
  },
}
