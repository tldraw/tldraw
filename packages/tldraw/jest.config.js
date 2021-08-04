module.exports = {
  displayName: 'tldraw',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/tldraw',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/src/lib/old_state/'],
}
