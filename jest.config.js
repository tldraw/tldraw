module.exports = {
  roots: ['<rootDir>/packages/core/src', '<rootDir>/packages/tldraw/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}
