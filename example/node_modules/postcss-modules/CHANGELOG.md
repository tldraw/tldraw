# Changelog

## 3.2.2

### Fixed

- Fixed user plugins order by Tom Jenkinson (@tjenkinson) https://github.com/css-modules/postcss-modules/pull/112

## 3.2.1

### Fixed

- Fixed an issue when some plugins were running multiple times by Tom Jenkinson (@tjenkinson) https://github.com/css-modules/postcss-modules/pull/111

## 3.2.0

### Changed

- [`localsConvention` option] now supports a custom function `(originalClassName: string, generatedClassName: string, inputFile: string) => className: string` by Gregory Waxman (@Akkuma) https://github.com/css-modules/postcss-modules/pull/109

## 3.1.0

### Added

- Added `exportGlobals` option

## 3.0.0

### Changed

- Dropped `css-modules-loader-core` dependency
- [Upgraded all the dependencies](https://github.com/css-modules/postcss-modules/pull/108)

### Breaking changes

- Dropped support for unsupported Node versions. Supported versions are 10, 12 and 14+ https://nodejs.org/en/about/releases/

## 2.0.0

### Added

- [`localsConvention` option](https://github.com/css-modules/postcss-modules#localsconvention) by Hamza Mihai Daniel (@allocenx) <https://github.com/css-modules/postcss-modules/pull/103>, <https://github.com/css-modules/postcss-modules/issues/93>

### Breaking changes

- `camelCase` camelCase removed, use the [`localsConvention` option](https://github.com/css-modules/postcss-modules#localsconvention) instead.

## 1.5.0

- Added `hashPrefix` option by Jesse Thomson (@jessethomson) <https://github.com/css-modules/postcss-modules/pull/98>

## 1.4.1

- Rebublished the previous release. Sorry :(

## 1.4.0

- Added export for other plugins by Evilebot Tnawi (@evilebottnawi) <https://github.com/css-modules/postcss-modules/pull/88>, <https://github.com/css-modules/postcss-modules/issues/29>

## 1.3.1

- Move dev tools to devDependecies by Anton Khlynovskiy (@ubzey) <https://github.com/css-modules/postcss-modules/pull/85>

## 1.3.0

- Updated dependecies
- Added prettier to format code

## 1.2.0

- Added option to transform classes to camelCase by Igor Ribeiro (@igor-ribeiro) <https://github.com/css-modules/postcss-modules/pull/82>

## 1.1.0

- Added ability to transmit outputFileName into getJSON by @lutien <https://github.com/css-modules/postcss-modules/pull/72>

## 1.0.0

- Dropped support for Node < 6
- Updated dependencies

## 0.8.0

- Updated PostCSS to 6 by Alexey Litvinov (@sullenor) <https://github.com/css-modules/postcss-modules/pull/65>

## 0.7.1

- Allowed empty string as opts.root by Sharon Rolel (@Mosho1) <https://github.com/css-modules/postcss-modules/pull/56>

## 0.7.0

- Allow async getJSON by Philipp A. (@flying-sheep) <https://github.com/css-modules/postcss-modules/pull/59>

## 0.6.4

- Added the `root` option to pass the root path by Sharon Rolel (@Mosho1) (<https://github.com/css-modules/postcss-modules/pull/55>)

## 0.6.3

- Fixed regression in `isValidBehaviour` function (<https://github.com/css-modules/postcss-modules/issues/53>)

## 0.6.2

- Refactored `getDefaultPluginsList` function

## 0.6.1

- Fixed `generateScopedName` bug with multiple postcss-modules instances (<https://github.com/css-modules/postcss-modules/issues/37>)

## 0.6.0

- Added `globalModulePaths` option (Thanks to @pospi).
- Refactored all the things.

## 0.5.2

- Updated dependencies

## 0.5.1

- Fixed sorting for composed dependencies by Josh Johnston (@joshwnj) (<https://github.com/css-modules/postcss-modules/issues/38>)

## 0.5.0

- Added `scopeBehaviour` option (<https://github.com/css-modules/postcss-modules/issues/22>)
- Added ability to pass a string to `generateScopedName` (<https://github.com/css-modules/postcss-modules/issues/21>)
- Updated dependencies

## 0.4.1

- Fixed processing errors capturing by Boris Serdiuk (@just-boris)

## 0.4.0

- Added support for custom loaders by Björn Brauer (@ZauberNerd)

## 0.3.0

- Fixed processing for imported CSS
- Added default callback for saving exported JSON

## 0.2.0

- Fixed JSON export with shallow imports (<https://github.com/outpunk/postcss-modules/issues/12>)
- Fixed lookup paths (<https://github.com/outpunk/postcss-modules/issues/13>)
- Fixed imports overriding (<https://github.com/outpunk/postcss-modules/issues/15>)
- Global refactoring under the hood

## 0.1.3

Fixed failing on comments by @dfreeman (<https://github.com/outpunk/postcss-modules/pull/14>)

## 0.1.2

Fixed module export for ES5 (<https://github.com/outpunk/postcss-modules/issues/9>)

## 0.1.1

Call getExports only for top level css

## 0.1.0

Initial version
