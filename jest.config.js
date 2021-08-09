/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.(tsx|jsx|ts|js)?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
      babelConfig: {
        presets: [["@babel/preset-react"], "@babel/preset-typescript"],
        plugins: ["@babel/plugin-syntax-import-meta"],
      },
    },
  },
  testEnvironment: "jsdom",
  modulePathIgnorePatterns: [
    "<rootDir>/packages/app/",
    "<rootDir>/packages/core/build/",
  ],
  moduleNameMapper: {
    "@tldraw/core": "<rootDir>/packages/core/src",
    "@tldraw/tldraw": "<rootDir>/packages/tldraw/src",
  },
}
