module.exports = {
  roots: ['<rootDir>'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'mjs', 'js', 'json', 'jsx'],
  testPathIgnorePatterns: ['<rootDir>[/\\\\](node_modules|.next)[/\\\\]'],
  transformIgnorePatterns: [
    'node_modules/(?!(roughjs|points-on-curve|path-data-parser|points-on-path|browser-fs-access)/)'
  ],
  transform: {
    '^.+\\.(ts|tsx|mjs)$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
  modulePaths: ['<rootDir>', 'node_modules'],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/test/__mocks__/fileMock.js',
  },
}
